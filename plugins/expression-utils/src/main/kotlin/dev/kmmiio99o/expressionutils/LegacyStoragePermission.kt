package dev.kmmiio99o.expressionutils

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val STORAGE_PERMISSION_REQUEST = 0x4555

internal class LegacyStoragePermission {
	private val lock = Any()
	private var pending: CancellableContinuation<Boolean>? = null
	private var hook: XC_MethodHook.Unhook? = null

	fun install() {
		val method = Activity::class.java.getDeclaredMethod(
			"onRequestPermissionsResult",
			Int::class.javaPrimitiveType,
			Array<String>::class.java,
			IntArray::class.java,
		).apply { isAccessible = true }

		hook = XposedBridge.hookMethod(
			method,
			object : XC_MethodHook() {
				override fun afterHookedMethod(param: MethodHookParam) {
					if (param.args.getOrNull(0) != STORAGE_PERMISSION_REQUEST) return
					val continuation = synchronized(lock) {
						pending.also { pending = null }
					} ?: return
					if (!continuation.isActive) return

					val granted = (param.args.getOrNull(2) as? IntArray)
						?.firstOrNull() == PackageManager.PERMISSION_GRANTED
					continuation.resume(granted)
				}
			},
		)
	}

	suspend fun ensureGranted(activity: Activity) {
		if (
			Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ||
			activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) ==
				PackageManager.PERMISSION_GRANTED
		) {
			return
		}

		check(request(activity)) {
			"Storage permission is required to save images on this Android version"
		}
	}

	fun uninstall() {
		hook?.unhook()
		hook = null
		synchronized(lock) {
			pending.also { pending = null }
		}?.cancel()
	}

	private suspend fun request(activity: Activity): Boolean =
		suspendCancellableCoroutine { continuation ->
			synchronized(lock) {
				check(pending == null) {
					"Another storage permission request is already in progress"
				}
				pending = continuation
			}
			continuation.invokeOnCancellation {
				synchronized(lock) {
					if (pending === continuation) pending = null
				}
			}
			activity.runOnUiThread {
				if (!continuation.isActive) return@runOnUiThread
				try {
					activity.requestPermissions(
						arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
						STORAGE_PERMISSION_REQUEST,
					)
				} catch (error: Throwable) {
					synchronized(lock) {
						if (pending === continuation) pending = null
					}
					if (continuation.isActive) {
						continuation.resumeWithException(error)
					}
				}
			}
		}
}
