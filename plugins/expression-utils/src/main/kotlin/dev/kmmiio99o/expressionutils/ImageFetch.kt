package dev.kmmiio99o.expressionutils

import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

internal const val MAX_IMAGE_BYTES = 50 * 1024 * 1024
private const val MAX_REDIRECTS = 5

internal data class ImagePayload(
	val bytes: ByteArray,
	val mimeType: String,
)

internal fun fetchImage(url: String): ImagePayload {
	var requestUrl = URL(url)
	repeat(MAX_REDIRECTS + 1) { redirectCount ->
		require(requestUrl.protocol.equals("https", ignoreCase = true)) {
			"Image URL redirected to an insecure connection"
		}
		val connection = requestUrl.openConnection() as? HttpURLConnection
			?: error("Unsupported image URL")
		try {
			connection.connectTimeout = 15_000
			connection.readTimeout = 30_000
			connection.instanceFollowRedirects = false
			connection.setRequestProperty("Accept", "image/*")
			connection.connect()

			if (connection.responseCode in 300..399) {
				check(redirectCount < MAX_REDIRECTS) {
					"Image URL redirected too many times"
				}
				val location = checkNotNull(connection.getHeaderField("Location")) {
					"Image redirect did not include a destination"
				}
				requestUrl = URL(requestUrl, location)
				return@repeat
			}

			check(connection.responseCode in 200..299) {
				"Image download failed (HTTP ${connection.responseCode})"
			}
			require(connection.contentLengthLong <= MAX_IMAGE_BYTES) {
				"Image exceeds the 50 MB limit"
			}
			val mimeType = connection.contentType
				?.substringBefore(';')
				?.trim()
				?.lowercase()
				?.takeIf { it in SUPPORTED_IMAGE_TYPES }
				?: error("Unsupported image type")
			return ImagePayload(readImageBytes(connection), mimeType)
		} finally {
			connection.disconnect()
		}
	}
	error("Image URL redirected too many times")
}

private fun readImageBytes(connection: HttpURLConnection): ByteArray {
	val output = ByteArrayOutputStream()
	connection.inputStream.use { input ->
		val buffer = ByteArray(8 * 1024)
		var total = 0
		while (true) {
			val count = input.read(buffer)
			if (count < 0) break
			total += count
			require(total <= MAX_IMAGE_BYTES) { "Image exceeds the 50 MB limit" }
			output.write(buffer, 0, count)
		}
	}
	return output.toByteArray().also {
		require(it.isNotEmpty()) { "Downloaded image is empty" }
	}
}

private val SUPPORTED_IMAGE_TYPES = setOf(
	"image/png",
	"image/apng",
	"image/jpeg",
	"image/webp",
	"image/gif",
)
