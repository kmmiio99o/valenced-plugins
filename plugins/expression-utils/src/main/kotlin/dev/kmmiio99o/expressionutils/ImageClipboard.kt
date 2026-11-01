package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

private val IMAGE_CLIPBOARD_IME_PACKAGES = setOf(
	"com.google.android.inputmethod.latin",
)

// Android exposes no standard IME flag for image clipboard support; unknown keyboards fail closed.
internal fun supportsImageClipboard(activity: Activity): Boolean =
	activeInputMethodPackage(activity) in IMAGE_CLIPBOARD_IME_PACKAGES

internal suspend fun copyImageToClipboard(
	activity: Activity,
	url: String,
	fileName: String,
): ImageTransferResult {
	val imePackage = activeInputMethodPackage(activity)
	check(imePackage in IMAGE_CLIPBOARD_IME_PACKAGES) {
		"Image clipboard is not supported by the selected keyboard"
	}

	val image = fetchImage(url)
	val uri = saveImageToPictures(activity, fileName, image)
	try {
		activity.grantUriPermission(
			imePackage,
			uri,
			Intent.FLAG_GRANT_READ_URI_PERMISSION,
		)
		suspendCancellableCoroutine<Unit> { continuation ->
			activity.runOnUiThread {
				try {
					val clipboard = checkNotNull(
						activity.getSystemService(ClipboardManager::class.java),
					) { "Android clipboard is unavailable" }
					clipboard.setPrimaryClip(
						ClipData.newUri(activity.contentResolver, fileName, uri),
					)
					continuation.resume(Unit)
				} catch (error: Throwable) {
					continuation.resumeWith(Result.failure(error))
				}
			}
		}
	} catch (error: Throwable) {
		activity.revokeUriPermission(
			imePackage,
			uri,
			Intent.FLAG_GRANT_READ_URI_PERMISSION,
		)
		activity.contentResolver.delete(uri, null, null)
		throw error
	}

	return ImageTransferResult(uri, image.bytes.size)
}

private fun activeInputMethodPackage(activity: Activity): String? =
	Settings.Secure.getString(
		activity.contentResolver,
		Settings.Secure.DEFAULT_INPUT_METHOD,
	)?.let(ComponentName::unflattenFromString)?.packageName
