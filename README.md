# Onshape Timelapse Generator

Downloads timestamped renders of an Onshape assembly's history (on any day where there is a change, even if no new version is made) in a consistent position and orientation to facilitate the creation of a timelapse video


## Running

1. Run `npm install` to install dependencies
2. Copy `.env.example` to `.env` and update constants to match your onshape document and api key.

To obtain an API key follow the instructions at https://onshape-public.github.io/docs/auth/apikeys/

The document and assembly ID can be found via the url: `https://cad.onshape.com/documents/DOCUMENT_ID/w/version/e/ASSEMBLY_ID`

3. Run `node download.ts` with a ts-supporting node version (or use Bun). By default, this will save a png for each selected version (max 1 per day), and then concatenate them into a GIF with 500ms frames. This behavior can be adjusted with the constants in download.ts. Note that OnShape's servers take some time to generate fresh images, if you run it a second time it will be much faster


