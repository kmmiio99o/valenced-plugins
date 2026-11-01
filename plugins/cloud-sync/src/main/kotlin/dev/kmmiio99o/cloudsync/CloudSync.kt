@file:JvmName("CloudSync")

package dev.kmmiio99o.cloudsync

import android.app.Activity
import android.content.Intent
import android.net.Uri
import app.valenced.bridge.asDelegate
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.OutputStream
import kotlin.coroutines.resumeWithException

private const val CREATE_JSON_REQUEST_CODE = 0x4353
private const val OPEN_JSON_REQUEST_CODE = 0x4354

@Suppress("UNUSED")
val cloudSync = plugin {
	val pickerLock = Any()
	var pendingPicker: CancellableContinuation<Pair<Activity, Uri>?>? = null
	var pendingPickerRequestCode: Int? = null
	var activityResultHook: XC_MethodHook.Unhook? = null

	start {
		val onActivityResult = Activity::class.java
			.getDeclaredMethod(
				"onActivityResult",
				Int::class.javaPrimitiveType,
				Int::class.javaPrimitiveType,
				Intent::class.java,
			)
			.apply { isAccessible = true }

		activityResultHook = XposedBridge.hookMethod(
			onActivityResult,
			object : XC_MethodHook() {
				override fun afterHookedMethod(param: MethodHookParam) {
					val requestCode = param.args.getOrNull(0) as? Int ?: return
					val continuation = synchronized(pickerLock) {
						if (pendingPickerRequestCode != requestCode) {
							return@afterHookedMethod
						}
						pendingPickerRequestCode = null
						pendingPicker.also { pendingPicker = null }
					} ?: return
					if (!continuation.isActive) return

					val uri = (param.args.getOrNull(2) as? Intent)?.data
					val destination =
						if (
							param.args.getOrNull(1) == Activity.RESULT_OK &&
							uri != null
						) {
							(param.thisObject as Activity) to uri
						} else {
							null
						}
					continuation.resumeWith(Result.success(destination))
				}
			},
		)

		suspend fun pickDocument(
			requestCode: Int,
			intent: Intent,
		): Pair<Activity, Uri>? = suspendCancellableCoroutine { continuation ->
			synchronized(pickerLock) {
				check(pendingPicker == null) {
					"Another file picker is already open"
				}
				pendingPicker = continuation
				pendingPickerRequestCode = requestCode
			}

			continuation.invokeOnCancellation {
				synchronized(pickerLock) {
					if (pendingPicker === continuation) {
						pendingPicker = null
						pendingPickerRequestCode = null
					}
				}
			}

			withAppActivity { activity ->
				activity.runOnUiThread {
					if (!continuation.isActive) return@runOnUiThread
					try {
						activity.startActivityForResult(intent, requestCode)
					} catch (error: Throwable) {
						synchronized(pickerLock) {
							if (pendingPicker === continuation) {
								pendingPicker = null
								pendingPickerRequestCode = null
							}
						}
						if (continuation.isActive) {
							continuation.resumeWithException(error)
						}
					}
				}
			}
		}

		registerNativeAsyncMethod("${manifest.id}.saveJsonFile") { args ->
			val argv = args.asDelegate()
			val fileName by argv.string()
			val contents by argv.string()
			require(
				fileName.endsWith(".json", ignoreCase = true) &&
					fileName == fileName.substringAfterLast('/'),
			) {
				"Choose a valid JSON file name"
			}

			val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
				addCategory(Intent.CATEGORY_OPENABLE)
				type = "application/json"
				putExtra(Intent.EXTRA_TITLE, fileName)
			}
			val destination = pickDocument(CREATE_JSON_REQUEST_CODE, intent)
				?: return@registerNativeAsyncMethod false

			val (activity, uri) = destination
			val output = checkNotNull(
				activity.contentResolver.openOutputStream(uri, "wt"),
			) {
				"Unable to open the selected destination"
			}
			writeJson(output, contents)
			true
		}

		registerNativeAsyncMethod("${manifest.id}.pickJsonFile") {
			val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
				addCategory(Intent.CATEGORY_OPENABLE)
				type = "application/json"
			}
			val selection = pickDocument(OPEN_JSON_REQUEST_CODE, intent)
				?: return@registerNativeAsyncMethod null

			val (activity, uri) = selection
			val input = checkNotNull(activity.contentResolver.openInputStream(uri)) {
				"Unable to read the selected JSON file"
			}
			input.bufferedReader(Charsets.UTF_8).use { it.readText() }
		}
	}

	stop {
		activityResultHook?.unhook()
		activityResultHook = null
		synchronized(pickerLock) {
			pendingPickerRequestCode = null
			pendingPicker.also { pendingPicker = null }
		}?.cancel()
	}
}

private fun writeJson(output: OutputStream, contents: String) {
	output.bufferedWriter(Charsets.UTF_8).use { it.write(contents) }
}
