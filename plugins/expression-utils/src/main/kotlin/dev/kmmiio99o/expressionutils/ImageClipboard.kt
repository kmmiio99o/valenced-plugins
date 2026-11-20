package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

internal suspend fun copyImageToClipboard(
	activity: Activity,
	url: String,
	fileName: String,
): ImageTransferResult {
	val image = fetchImage(url)
	val uri = saveImageToPictures(activity, fileName, image)
	try {
		suspendCancellableCoroutine<Unit> { continuation ->
			activity.runOnUiThread {
				try {
					val clipboard = checkNotNull(
						activity.getSystemService(ClipboardManager::class.java),
					) { "Android clipboard is unavailable" }
					// An Intent with the grant flag on the clip item lets any app paste.
					val intent = Intent().addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
					val item = ClipData.Item(null, intent, uri)
					val mimeType = activity.contentResolver.getType(uri)
						?: checkNotNull(activity.contentResolver.getType(uri)) { "Unknown image type" }
					clipboard.setPrimaryClip(ClipData(fileName, arrayOf(mimeType), item))
					continuation.resume(Unit)
				} catch (error: Throwable) {
					continuation.resumeWith(Result.failure(error))
				}
			}
		}
	} catch (error: Throwable) {
		activity.contentResolver.delete(uri, null, null)
		throw error
	}

	return ImageTransferResult(uri, image.bytes.size)
}
