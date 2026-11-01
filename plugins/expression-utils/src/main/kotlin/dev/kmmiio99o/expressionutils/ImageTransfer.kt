package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.net.Uri

internal data class ImageTransferResult(
	val uri: Uri,
	val bytes: Int,
)

internal fun downloadImageToDownloads(
	activity: Activity,
	url: String,
	fileName: String,
): ImageTransferResult {
	val image = fetchImage(url)
	val uri = saveImageToDownloads(activity, fileName, image)
	return ImageTransferResult(uri, image.bytes.size)
}
