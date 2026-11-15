import fs from "fs/promises";
import dotenv from "dotenv"
import { PNG } from "pngjs"
//@ts-ignore
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc

dotenv.config();


const ACCESS_KEY = process.env.ONSHAPE_ACCESS_KEY;
const SECRET_KEY = process.env.ONSHAPE_SECRET_KEY;
const DOCUMENT = process.env.ONSHAPE_DOCUMENT_ID;
const ASSEMBLY = process.env.ONSHAPE_ASSEMBLY_ID;
const SAVE_FRAMES = true
const SAVE_GIF = true;
const GIF_FRAME_DURATION_MS = 500




if (!SECRET_KEY || !ACCESS_KEY || !DOCUMENT || !ASSEMBLY) {
	console.error("You must set required environment variables (see readme)")
	process.exit(1)
}
const key = btoa(`${ACCESS_KEY}:${SECRET_KEY}`)


async function getImage(microversion: string): Promise<null | string> {
	const resp = await fetch(`https://cad.onshape.com/api/v17/assemblies/d/${DOCUMENT}/m/${microversion}/e/${ASSEMBLY}/shadedviews?viewMatrix=isometric&outputHeight=600&outputWidth=600&pixelSize=0.003&edges=show&showAllParts=false&includeSurfaces=true&useAntiAliasing=false&includeWires=false`, {
		headers: {
			Accept: "application/json",
			Authorization: "Basic " + key,
		},
	})
	if (!resp.ok) {
		console.error("Image fetch failed", resp.statusText, await resp.text())
		return null
	}
	const body = await resp.json()
	if (body.images == null || body.images.length < 1) {
		return null
	}
	return body.images[0];
}

// Subset of returned data
interface Version {
	name: string
	createdAt: Date // Rounded to nearest hour 
	microversion: string
}

async function getVersions(): Promise<Version[]> {
	const resp = await fetch(`https://cad.onshape.com/api/v17/documents/d/${DOCUMENT}/versions?offset=0&limit=0`, {
		headers: {
			accept: "application/json",
			authorization: "Basic " + key,
		},
	})
	if (!resp.ok) {
		console.error("Fetch failed", resp.status, resp.statusText, await resp.text())
		return []
	}
	const body = await resp.json()
	const versions: Version[] = []
	body.forEach((version: any) => {
		const creationDate = new Date(version.createdAt)
		if (versions.length > 0 && versions[versions.length - 1].createdAt.toLocaleDateString() == creationDate.toLocaleDateString()) {
			const old = versions.pop(); // Replace with newer version
			console.log("Replacing", old?.name, "with", version.name, "for", creationDate.toLocaleDateString())
		}
		versions.push({
			name: version.name,
			createdAt: creationDate,
			microversion: version.microversion
		});
	});
	return versions;
}

function toSlideshow(images: string[], delayMs = 500): Uint8Array|null  {
	if (images.length === 0) return null

	const gif = GIFEncoder();
	const width = 600;
	const height = 600;

	images.forEach((b64) => {
		const png = PNG.sync.read(Buffer.from(b64, "base64"));
		
		const palette = quantize(png.data, 256);
		const index = applyPalette(png.data, palette);
		gif.writeFrame(index, width, height, { palette, delay: delayMs });
	});

	gif.finish();
	return gif.bytes();
}

async function main() {
	const versions = await getVersions()
	await fs.mkdir("./img").catch(() => {})
	if (SAVE_FRAMES) await fs.mkdir(`./img/${DOCUMENT}/${ASSEMBLY}/`, { recursive: true }).catch(() => {})
	console.log("Rendering images...")

	let complete = 0;
	const promises = versions.map(async (version) => {
		console.log("fetching render for", version.name, version.createdAt.toLocaleDateString())
		const img = await getImage(version.microversion)
		if (SAVE_FRAMES && img != null) {
			await fs.writeFile(`./img/${DOCUMENT}/${ASSEMBLY}/${version.createdAt.toLocaleDateString().replaceAll("/", "-")}.png`, img, { encoding: "base64" })
		}
		complete++
		console.log(`fetched render for ${version.name} (${complete}/${versions.length})`)
		return img
	})
	const images = await Promise.all(promises)

	if (SAVE_GIF) {

	const gif = toSlideshow(images.filter((img) => img != null), GIF_FRAME_DURATION_MS)
	if (gif != null) {
		await fs.writeFile(`./img/${DOCUMENT}_${ASSEMBLY}.gif`, gif)
	}
	}
}


main()
