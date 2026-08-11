# Tailwind cleanup TODO

The Tailwind v4 setup itself is in good shape: `source(none)` plus an explicit `@source`, the class-based
`dark` variant, the semantic color bridge in `@theme inline`, and prettier class sorting are all deliberate
and correctly reasoned in the comments. Theming goes through CSS variables rather than `dark:` pairs — only
three `dark:` utilities exist in the whole codebase, which is the right call and should stay that way.

The items below are the places that still read like a literal CSS-to-utility translation. Everything here was
checked against the current tree; where a swap would change rendering, that is called out.

## Design tokens that were never defined

- [ ] **Define a `--text-*` scale.** There is no typography scale in `@theme` at all, so every single font size
      in the app is an arbitrary value — 24 distinct ones, mixing three units: `text-[1.2em]` (×11),
      `text-[0.9em]` (×7), `text-[1.3em]` (×5), `text-[1.1em]` (×4), `text-[0.95em]` (×3), plus one-offs like
      `text-[0.928rem]`, `text-[1.14rem]`, `text-[0.7rem]`, `text-[18px]`, `text-[15px]`. Since `:root` sets
      `font-size` from `--font-size`, an em-based scale (`--text-sm: 0.9em`, `--text-lg: 1.2em`, …) would keep
      the existing scalar behavior while giving the app a real vocabulary.

- [ ] **Establish a spacing scale, then replace the repeated bracketed lengths.** ~440 arbitrary-value
      utilities across the tree, dominated by a 5px rhythm: `[10px]` ×70, `[5px]` ×59, `[20px]` ×24,
      `[15px]` ×18, `[7px]` ×15. Densest files: `src/popup/AudioPanel.tsx` (31), `src/options/SectionFlags.tsx`
      (22), `src/options/SectionHelp.tsx` (21), `src/options/ListItem.tsx` (20), `src/popup/Header.tsx` (16).
      Where the built-in scale already expresses the value, use it (`p-[10px]` → `p-2.5`, `p-[20px]` → `p-5`);
      otherwise add named tokens for the 5px rhythm. Keep genuinely structural one-offs arbitrary: grid
      templates, `calc(...)`, viewport limits, and the vendor pseudo-element values in `Slider.tsx`.

- [ ] **Route radii through the theme.** Two separate problems:
      - `rounded-[var(--radius)]` in `Toggle.tsx`, `Menu.tsx`, `KeyPicker.tsx`, `FloatTooltip.tsx`, `Reset.tsx`,
        `ListItem.tsx`, and `SegmentedButtons.tsx`, and `rounded-[var(--radius-sm)]` in `ListItem.tsx:37`, all
        have exact utility equivalents already mapped in `@theme inline`: `rounded-lg` and `rounded-sm`.
      - `rounded-[5px]` (`ToggleButton.tsx`, `AudioPanel.tsx:77`, `ReverseButton.tsx:73`, `MediaView.tsx:46`)
        and `rounded-[10px]` (`WarningBanner.tsx:27`, `keybindControl/index.tsx:136`) sit outside the scale
        entirely. Decide whether they are `rounded-sm` (4px) / `rounded-xl`, or add tokens for them.

- [ ] **Prune unused palette scaffolding from `src/main.css`.** Verified to have zero consumers outside their
      own declarations: `chart-1` through `chart-4`, every `sidebar-*` token, and `accent-foreground`.
      (`accent` itself is used, twice, in `MediaView.tsx`.) On the radius side, the `--radius-md` and
      `--radius-xl` bridges are unused; `--radius-sm`, `--radius-lg`, and `--radius-2xl` are all live.

- [ ] **Replace color-by-accident names with purpose-based tokens.** `text-chart-5` is doing duty as a success
      color in `QrPromo.tsx:35` and `ReverseButton.tsx:75`, and `SelfPromo.tsx:26` hardcodes
      `text-[#5a70a7] dark:text-[#c4c4c4]` — the only place in the app that hardcodes a color pair instead of
      using a variable. Introduce `success` / `promo` tokens. While there, `ReverseButton.tsx:75`'s
      `bg-[color-mix(in_oklab,var(--chart-5)_20%,var(--background))]` renders identically to `bg-chart-5/20`
      given the parent is `bg-background`.

- [ ] **Remove the duplicate `--radius-sm` … `--radius-2xl` declarations from `:root`** once their direct
      `var()` consumers are gone (only `ListItem.tsx:37` remains). The `@theme inline` block should be the
      single radius bridge derived from `--radius`.

## Mechanical conversion residue

- [ ] **Remove the 28 redundant `border-solid` utilities** across `src/comps`, `src/options`, and `src/popup`
      (21 files). Preflight already sets `border: 0 solid` on `*`, and nothing in `@layer base` or the page
      chrome overrides `border-style` to anything else.

- [ ] **Normalize simple arbitrary forms to first-class utilities and variants.** All of these are exact
      equivalents:
      - `[&:hover]:…` → `hover:…` — `RegularTooltip.tsx:16`, `OrlHeader.tsx:24` and `:28`,
        `ShortcutWarning.tsx:12`.
      - `bg-[inherit]` / `text-[inherit]` → `bg-inherit` / `text-inherit` in `WarningBanner.tsx:27`.
        `Menu.tsx:11` already uses the first-class forms, so this is pure inconsistency.
      - `opacity-[.85]` → `opacity-85` (`Menu.tsx:47`), `opacity-[.65]` → `opacity-65`
        (`ShortcutWarning.tsx:12`), `brightness-[.9]` → `brightness-90` and `brightness-[1.3]` →
        `brightness-130`, `[&>svg]:scale-[1.15]` → `[&>svg]:scale-115` (`FxControl.tsx:112`).
        `opacity-[.66]` has no bare-value equivalent — leave it, or round it to `opacity-65`.
      - `ease-[ease]` in `ShortcutWarning.tsx:12` is a no-op; `ease` is the CSS default. Delete it.
      - `leading-[0]` in `Toggle.tsx:25` → `leading-0`, which the codebase already uses 10 times elsewhere.
        **Not** `leading-none` — that is `1`, not `0`.
      - `[justify-items:right]` → `justify-items-end` (`Header.tsx:88`, `SectionEditor.tsx:238`) and
        `[justify-content:left]` → `justify-start` (`SectionRules.tsx:224`). Safe today: the app never sets
        `dir`, so nothing is in a logical-direction context. `SectionHelp.tsx:24` already uses
        `justify-items-end`.

      Two traps. `leading-[normal]` in `Tooltip.tsx:37` must **stay** arbitrary — Tailwind's `leading-normal`
      is `1.5`, not the CSS `normal` keyword. And `[font-weight:bolder]` in `OrlHeader.tsx:15` must stay too;
      `bolder` is relative to the parent's weight, so `font-bold` (700) is not the same thing.

- [ ] **Fix `src/popup/SelfPromo.tsx:26`.** Three things in one class list: `group-[&:hover]:opacity-50` should
      be `group-hover:opacity-50`; `transition-colors` should be `transition-opacity`, since opacity is the
      only property that changes; and the class list is unsorted, which is why this is the one file that fails
      `npm run format`.

- [ ] **Convert the remaining static inline styles to utilities.** All are constant, none carry runtime values:
      `Filters.tsx:74` (`padding` / `marginLeft`), `IndicatorModal.tsx:32` and `:179` (`marginRight`),
      `KebabList.tsx:58` and `keybindControl/NameArea.tsx:491` (`pointerEvents: "none"` →
      `pointer-events-none`), `faqs.tsx:138` (`verticalAlign: "middle"` → `align-middle`). Keep the inline
      styles that do carry runtime values or set custom properties: slider progress, menu coordinates,
      `SpeedControl`'s `--padding`, and `ModalBase`'s visual-viewport geometry.

- [ ] **Deduplicate the scrollbar styling.** `URLModal.tsx:49` sets
      `[scrollbar-width:thin] [scrollbar-color:var(--muted)_var(--background)]`, repeating verbatim what
      `main.css` already declares for `.options-page #root`. Tailwind has no scrollbar utilities, so an
      `@utility thin-scrollbar` is the right home for both.

## Dead marker classes

- [ ] **Delete the inert legacy CSS class names.** Audited every non-utility token in every `className` in
      `src/**/*.tsx` against all CSS files, arbitrary-variant selectors, and DOM queries. The following have
      **no** remaining consumer of any kind and are pure migration residue:

      `active`, `colored`, `toggle`, `enabled`, `playing`, `recording`, `selected`, `highlight`, `wide`,
      `preset`, `reset`, `muted`, `header`, `name`, `values`, `label`, `section`, `link`, `support`,
      `urlBubble`, `triggerValues`, `globalPicker`, `intoPane`, `Filter`, and the component-name classes
      `CycleInput`, `EqualizerControl`, `ErrorFallback`, `FloatTooltip`, `FxControl`, `Header`,
      `KeybindControl`, `KeyPicker`, `Menu`, `Minmax`, `ModalBase`, `NumericInput`, `Origin`, `OrmHeader`
      (note the typo — it is in `OrlHeader.tsx`), `RegularTooltip`, `Reset`, `ReverseButton`,
      `SegmentedButtons`, `ShortcutWarning`, `SliderPlus`, `SpeedControl`, `SvgFilter`, `SvgFilterList`,
      `Toggle`, `WarningBanner`, plus `Filters`, `List`, `SectionEditor`, `SectionHelp`.

      Keep exactly these — they are real hooks: `Move` (`[&>.Move]` in `Filters.tsx:67`), `SliderMicro`
      (`[&>.SliderMicro]` in `OptionField.tsx:9`), `ListItemCore` (`getElementsByClassName` in `List.tsx:36`),
      `ListItemLabel` (`classList.contains` in `List.tsx:29`), `ListItemSub` and `ListItem`
      (`ListItem.tsx:27`), `dragging` (`MoveDrag.tsx:5`), `noBottomBorderMediaItem` (`MediaView.tsx:27`),
      and `shortcutsKebabOption` (`Header.tsx:364`). Renaming those eight to explicit `data-*` attributes
      would document the contract; leaving them is also fine as long as the rest go.

      One near-miss worth knowing about: `.reset` and `.selected` *do* appear in
      `src/contentScript/isolated/utils/Interactive.css` and `src/contentScript/pageDraw/styles.css`, but those
      style the injected content-script widgets, a completely separate DOM from the popup and options pages.
      They are not hooks for `AudioPanel.tsx` or `SegmentedButtons.tsx`.

## Components and state

- [ ] **Stop re-implementing `ToggleButton` by copy-paste.** `AudioPanel.tsx:76-79` and `ReverseButton.tsx:73`
      both open with a literal copy of `ToggleButton`'s own class string —
      `toggle … rounded-[5px] … text-foreground/50 opacity-70` plus
      `active enabled:border-border-xx enabled:text-foreground enabled:opacity-100`. The AudioPanel reset button
      is byte-for-byte `ToggleButton` with a different border width and can just *be* one. `ReverseButton`
      needs a colored-state variant (`chart-5` / `destructive`), which is worth adding to `ToggleButton` rather
      than reproducing.

- [ ] **Drive visual state from the accessibility attributes already present.** `Toggle.tsx` sets
      `aria-checked` and `ToggleButton.tsx` sets `aria-pressed`, then both ignore them and re-derive the same
      state inside `cn()`. `aria-checked:*` / `aria-pressed:*` variants remove the duplication.
      `SegmentedButtons.tsx` and `TabButton.tsx` expose no state attribute at all — give them one first.
      `SegmentedButtons.tsx:6` is also the only place in the codebase building classes with a template literal
      instead of `cn()`.

- [ ] **Consolidate button variants instead of undoing global button styles.** `@layer base` in `main.css`
      gives every `button` a background, border, padding, radius, and focus outline; then `@utility icon`
      strips four of them back off, `HeaderAction` and `MoveDrag` strip more (`border-0`, `p-0`,
      `focus:outline-none`, `bg-inherit`), and `MediaView.tsx:46` strips them again inline. A `Button` /
      `IconButton` primitive — or shared class constants with variants — would make base, icon, tab, toggle,
      and destructive explicit instead of a cascade tug-of-war.

- [ ] **Replace component-name descendant selectors with slots or props.** `OptionField.tsx:9` reaches into
      `.SliderMicro`, `Filters.tsx:67` into `.Move`, `ListItem.tsx:27` into `.ListItemSub`, and
      `MediaView.tsx:27` depends on a root-level `.noBottomBorderMediaItem` toggled imperatively from
      `SelfPromo.tsx:13` and `QrPromo.tsx:21`. `data-slot` / `data-state` selectors document the contract
      without keeping stylesheet-era class names alive.

- [ ] **Extract the repeated layout fragments.** Exact duplicates: `min-h-[40px] p-[8px]` ×6 across
      `AudioPanel.tsx`, `FxPanel.tsx`, `MainPanel.tsx`; `absolute top-[-4px] left-[50px]` ×4 in
      `SectionFlags.tsx` (three) and `WidgetModal.tsx`; `p-[7px] text-[1.2em] uppercase` ×2 in `SectionHelp.tsx`;
      `mt-[20px] w-[…]` on four of the five `ModalContent` call sites. The `[--field-name-width:150px]`
      pattern in `SpeedPresetModal.tsx` / `CinemaModal.tsx` is the *good* version of this — arbitrary
      properties feeding a shared component — and should be the model.

## Complex styles and cascade

- [ ] **Move the range-input implementation out of `src/comps/Slider.tsx`.** Three constants totaling ~2.2KB of
      class string repeat every WebKit and Gecko pseudo-element rule (11 `[&::-webkit-slider-thumb]`, 9
      `[&::-moz-range-thumb]`, 6 each for the tracks). A single `@utility slider` keeps those pseudo-element
      rules together in CSS, and leaves the JSX holding only the `--slider-*` variable values and state
      modifiers — which is the part that actually varies.

- [ ] **Replace escalating arbitrary z-indexes with named layers.** Four unrelated magnitudes:
      `Menu.tsx:32` `z-[99999999]`, `ModalBase.tsx:59` `z-[9999999999]`, `Header.tsx:376`/`:384`
      `z-[999999999999]`, `Tooltip.tsx:37` `z-[9999999999999]`. Note the menu currently sits *below* its own
      modal backdrop's stacking context by two orders of magnitude — it works only because `Menu` renders
      inside `ModalBase`. Define overlay/menu/modal/tooltip/debug tokens so the ordering is reviewable.

- [ ] **Add named `mobile` and `rtl` custom variants.** Both root classes exist and are set imperatively
      (`popup.tsx:60`, `options.tsx:43`, `options.tsx:58`), but only `main.css`'s `.mobile .popup-page` and
      `NameArea.tsx:133`'s `[:root:not(.rtl)_&]:` consume them as selectors. Everywhere else, `ModalContent`,
      `ModalText.tsx:30`, and `SectionRules.tsx:324` call `isMobile()` *during render* to pick between class
      strings — styling that has left the class list for JS. `ModalBase.tsx:61` also emits an `isMobile` class
      that nothing matches. `@custom-variant mobile (&:is(.mobile, .mobile *))` turns all of it into
      `mobile:max-h-[90%]`. Keep the imperative `visualViewport` sizing in `ModalBase` — that is behavior,
      not styling.

- [ ] **Scope the global `* > svg` opacity rule in `main.css:274` to an icon primitive.** It sets `opacity: .8`
      with a `:hover` bump on *every* SVG in the app, which forces local repairs (`[&>svg]:opacity-100` in
      `MediaView.tsx:46`) and means an icon brightens on its own hover rather than its button's. Icon opacity
      should follow the owning control's state.

- [ ] **Revisit the high-specificity `dark` variant and the unlayered document defaults.** Both are documented
      compatibility measures in `main.css` (lines 8-12 and 73-75), and both deliberately defeat Tailwind's
      low-specificity, utilities-win cascade — the `:is()` variant to hold (0,2,0), and the unlayered `:root` /
      `body` so nothing in `@layer base` can outrank them. With only three `dark:` utilities left in the app,
      the specificity bump may no longer be buying anything. Once visual parity is locked, try a `:where()`
      dark selector and move `body` into `@layer base`.

- [ ] **`Tooltip.tsx:39-40` builds a detached element and assigns utility classes imperatively.** It works —
      the class string is in a scanned source file — but it is the one place where the popup's entire
      appearance lives outside React and outside any `cn()` call, so `twMerge` can never reconcile it.
      `Header.tsx:376`/`:384` do the same for the shortcut overlay. Worth a comment at minimum.
