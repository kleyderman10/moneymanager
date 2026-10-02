# Knexura Flow official assets

The eight original PNGs supplied by the user are preserved without modification.

- icon: original file ending in -1.png
- symbol: -2.png (transparent)
- logo: -3.png (transparent; dark lettering, intended for a light background)
- horizontal banner: -4.png
- splash: -5.png
- transaction, budget and report references: -6.png, -7.png, -8.png

Production uses the official icon plus accessible text on dark surfaces. The
horizontal banner is used in Login and About. Reference screenshots do not
replace functional screens or live financial data.

Derived resources only resize/pad the original artwork: WebP banner/icon for
web performance, PWA sizes, adaptive Android icon and native splash images.
The source icon is opaque and retains its supplied rounded frame and corners.
The maskable PWA derivative adds a safe margin around the supplied icon.

Native generation command from the project root:

npx --no-install capacitor-assets generate --android --ios --assetPath resources --iconBackgroundColor '#071D29' --iconBackgroundColorDark '#071D29' --splashBackgroundColor '#071D29' --splashBackgroundColorDark '#071D29'

resources/icon-only.png uses the official icon; icon-foreground.png uses the
transparent symbol; icon-background.png is solid navy. resources/splash.png
and splash-dark.png contain the original portrait art on a 2732px navy square.

Keep application/bundle ID online.knexura.moneymanager unchanged.