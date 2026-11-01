package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore

internal fun saveImageToPictures(
	activity: Activity,
	requestedName: String,
	image: ImagePayload,
): Uri {
	val values = ContentValues().apply {
		put(MediaStore.Images.Media.DISPLAY_NAME, canonicalImageName(requestedName, image.mimeType))
		put(MediaStore.Images.Media.MIME_TYPE, image.mimeType)
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
			put(
				MediaStore.Images.Media.RELATIVE_PATH,
				"${Environment.DIRECTORY_PICTURES}/Expression Utils",
			)
			put(MediaStore.Images.Media.IS_PENDING, 1)
		}
	}
	val resolver = activity.contentResolver
	val uri = checkNotNull(
		resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values),
	) { "Unable to create the image file" }

	try {
		checkNotNull(resolver.openOutputStream(uri, "w")) {
			"Unable to write the image file"
		}.use { it.write(image.bytes) }
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
			check(resolver.update(uri, publishedValues(), null, null) > 0) {
				"Unable to publish the saved image"
			}
		}
		return uri
	} catch (error: Throwable) {
		resolver.delete(uri, null, null)
		throw error
	}
}

internal fun canonicalImageName(requestedName: String, mimeType: String): String {
	val extension = when (mimeType) {
		"image/gif" -> "gif"
		"image/apng" -> "apng"
		"image/jpeg" -> "jpg"
		"image/webp" -> "webp"
		else -> "png"
	}
	return "${requestedName.substringBeforeLast('.', requestedName)}.$extension"
}

internal fun publishedValues() = ContentValues().apply {
	put(MediaStore.Images.Media.IS_PENDING, 0)
}
