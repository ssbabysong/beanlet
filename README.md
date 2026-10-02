# Beanlet

A small bilingual coffee journal: coffee shelf, built-in coffee library, roast freshness guidance and a pour-over calendar.

## Use

- Your shelf starts empty. Bean atlas contains 14 Hydrangea coffees and their original artwork; add individual bags to your shelf. The previous untouched starter bags are removed once, while edited bags and bags with brew records are preserved.
- Open Bean atlas → Me to choose 中文 or English and manage backups.
- Your coffees, photos, custom library and brew records are saved in **IndexedDB in this browser**. There is no account or cloud sync.
- Bean atlas → Me → Export backup saves all your records and photos as one JSON file. Import backup adds missing records; matching IDs are skipped, preserving existing records.
- Export before clearing browser/site data. Changing browser, device or website address creates a separate local collection.
- To migrate from the original cloud app, open https://bean-island-journal.csscss.chatgpt.site/ → Settings → Export backup for migration, then import that file here.

## Tasted atlas

Discover and Tasted share the atlas tab. Logging a brew or finishing a bag saves a coffee sticker; manual marks and custom tasting entries need no inventory bag. Bags with the same catalog ID share one sticker. Memories survive deleting a bag and are included in JSON backups; unknown dates remain blank.

## Development

Node.js 22.13+:

```sh
npm ci
npm run dev
npm test
npm run build
```

## GitHub Pages

Source branch: `main`. Enable **Settings → Pages → Source → GitHub Actions**. The included workflow tests, builds and publishes the `docs/` output whenever `main` changes. For manual branch-based publishing, `main /docs` also contains the built site. Do not use both methods at the same time.

## Fonts and artwork

- Chinese: [Xiaolai / 小赖字体](https://github.com/lxgw/kose-font), SIL OFL 1.1. License included in `public/fonts/xiaolai/OFL.txt`. Common interface characters load first; the full font supports custom names.
- Latin: [Annie Use Your Telescope](https://fonts.google.com/specimen/Annie+Use+Your+Telescope), SIL OFL 1.1. License included in `public/fonts/annie/OFL.txt`.
- Hydrangea product artwork belongs to Hydrangea Coffee Roasters. Product cards retain links and attribution; this project does not grant rights to that artwork.

No private collection records, credentials, database exports, or cloud runtime configuration are included in this repository.
