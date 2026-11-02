You are a senior software architect, full-stack engineer, React and TypeScript specialist, UI/UX designer, computational calendar expert, and print-production software engineer.

Your task is to design, develop, test, and deliver a complete, production-quality, browser-based Hungarian calendar generator.

The application must be fully functional, technically accurate, visually professional, and ready for deployment through GitHub Pages. It must not be a prototype, visual demonstration, incomplete implementation, or collection of code snippets.

Implement every requirement described below. Make sound engineering decisions where implementation details are unspecified, prioritizing correctness, usability, maintainability, performance, and export fidelity.

Do not replace required functionality with placeholders, simulated interactions, non-functional buttons, or superficial implementations. Do not claim that any feature works unless it has been implemented and appropriately tested.

PROJECT OBJECTIVE

Build a sophisticated online calendar design application that allows users to create fully customizable annual and monthly calendars, incorporate photographs and personal events, adjust typography and layout with millimeter-level precision, and export high-quality print-ready JPG, PNG, and PDF files.

The interface must be entirely in Hungarian.

The application must be publicly accessible without registration and optimized for desktop computers.

The initial deployment target is GitHub Pages, using an existing or newly configured GitHub repository. The application must operate without a dedicated backend server.

TECHNOLOGY AND ARCHITECTURE

Use React, TypeScript with strict type checking, and Vite unless an objectively superior GitHub Pages-compatible solution is justified.

Use reliable, actively maintained libraries with licenses suitable for public deployment.

Implement a modular architecture with clearly separated responsibilities for date calculations, Hungarian public holidays, Hungarian namedays, personal events, calendar layouts, typography, image editing, visual editing, rendering, exporting, project management, templates, and validation.

Recommended modules include DateEngine, HolidayEngine, NamedayEngine, PersonalEventEngine, CalendarLayoutEngine, TypographyEngine, ImageEditor, DesignEditor, RenderEngine, ExportEngine, ProjectManager, TemplateManager, and ValidationEngine.

Keep business logic separate from React presentation components.

Use a consistent document model and a shared rendering pipeline for the interactive preview and exported documents.

Choose suitable libraries for state management, component interactions, image manipulation, font handling, PDF generation, ZIP generation, schema validation, and testing.

Use Web Workers for computationally expensive operations where appropriate.

The production application must function as a static website hosted on GitHub Pages. Configure Vite base paths correctly for repository-based deployments, ensure all assets load from the appropriate paths, and provide GitHub Actions workflows for automatic building, testing, and deployment.

Avoid backend dependencies, server-side rendering requirements, and services that require private API keys in the browser.

CALENDAR DATE ENGINE

Implement a mathematically correct perpetual calendar supporting years 1 through 9999 using the proleptic Gregorian calendar.

The date engine must be deterministic, independent of the user's timezone, and free from daylight-saving-time-related errors.

Do not rely blindly on JavaScript Date constructors, particularly for years 1–99 or local-time date calculations.

Correctly implement Gregorian leap-year rules:

A year is a leap year if divisible by 4, except years divisible by 100, unless also divisible by 400.

Examples: 1900 is not a leap year, 2000 is a leap year, 2024 is a leap year, 2100 is not a leap year, and 2400 is a leap year.

Determine every month's exact number of days and every date's correct weekday.

Monday must be the default first day of the week, with an option to switch to Sunday.

Internally, use consistent weekday numbering, preferably Monday = 1 through Sunday = 7.

Changing the first weekday must rearrange the displayed calendar without changing the underlying weekday of any date.

Support optional ISO 8601 week numbers, including correct week-year handling around year boundaries.

Calculate Gregorian Easter Sunday using a mathematically validated algorithm such as Meeus/Jones/Butcher.

Derive Easter Monday as Easter Sunday plus one day, Pentecost Sunday as Easter Sunday plus 49 days, and Pentecost Monday as Easter Sunday plus 50 days.

Validate the Easter calculation against independent reference data over the entire supported year range.

The system must correctly support dates near year boundaries, including year 1 and year 9999, without producing out-of-range adjacent dates.

HUNGARIAN PUBLIC HOLIDAYS

Automatically identify and highlight Hungarian official public holidays.

The modern Hungarian holiday framework includes New Year's Day, March 15, Good Friday, Easter Monday, May 1, Pentecost Monday, August 20, October 23, November 1, and December 25–26, subject to the laws applicable to the selected year.

Do not assume that current Hungarian public holiday legislation applies historically to all years between 1 and 9999.

Separate mathematical calendar calculations from legally verified holiday data.

Use year-specific rules where trustworthy historical or legal information is available.

For years without verified legal data, provide an explicitly labeled projection using a selected modern ruleset, rather than presenting projected holidays as historically verified facts.

Do not invent future working-day substitutions or bridge-day arrangements.

Differentiate official public holidays from rescheduled rest days and working Saturdays.

Holiday rules and their validity periods must be maintainable through structured data.

The annual calendar must allow independent customization of holiday number color and holiday background color.

The monthly calendar must support a shared highlighting style for Saturdays, Sundays, and official public holidays.

Holiday highlighting must be configurable and optionally disabled.

Do not automatically include unofficial commemorative days, religious observances that are not official public holidays, or unrelated seasonal events.

HUNGARIAN NAMEDAY DATABASE

Integrate a trustworthy Hungarian nameday database.

Verify the data source and its redistribution license. Do not fabricate missing nameday information.

Support primary and secondary namedays and display a maximum of two namedays per date.

The underlying dataset may contain additional names, but the calendar display must respect the two-name limit.

Allow the user to edit the namedays assigned to individual dates.

Store nameday overrides in the saved project and provide a way to restore the original dataset values.

Handle February 29 using explicitly defined nameday records rather than invented fallback values.

Keep standard Hungarian namedays completely separate from user-created personal nameday events.

ANNUAL CALENDAR MODE

Implement a single-page annual calendar displaying all 12 months in a three-column, four-row arrangement.

The order must be January, February, March on the first row; April, May, June on the second; July, August, September on the third; and October, November, December on the fourth.

Months progress from left to right and top to bottom.

Each month must have a header containing its Hungarian month name.

Within each month, display only numbered dates, without namedays or personal events.

Arrange dates in compact weekly rows, aligned correctly beneath the weekdays from Monday through Sunday by default.

Use empty positions before the month's first date where required.

Months must occupy the appropriate four, five, or six week rows. Do not display invalid dates.

Include configurable year numbering, typography, margins, month spacing, header spacing, number sizing, and alignment.

Supported physical paper sizes are A4, A5, A6, and A7.

Support both portrait and landscape orientation for every size.

Use these ISO paper dimensions:

A4: 210 × 297 mm.\
A5: 148 × 210 mm.\
A6: 105 × 148 mm.\
A7: 74 × 105 mm.

The layout must automatically adapt to the selected page size while respecting the intended geometry and available margins.

Provide warnings when text or dates become too small for comfortable printing.

PHOTO-ENHANCED ANNUAL CALENDAR

Implement an optional photo-calendar mode.

Allow users to place the annual calendar within a configurable section of the selected page, leaving the remaining space for one or more photographs as supported by the layout.

For example, on an A6 page, the annual calendar should be configurable to occupy an A7-sized region, with a photograph placed alongside it.

The relative size, position, and proportion of the calendar and photograph areas must be adjustable.

Provide image upload, repositioning, scaling, cropping, aspect-ratio preservation, border color, border thickness, rounded corners, circular cropping, oval cropping, and shadow effects.

Support dragging and resizing directly on the editing canvas.

Preserve image quality and avoid unintended stretching or distortion.

Handle image orientation metadata appropriately.

Provide print-quality warnings when an image's effective resolution is insufficient for the selected output size.

MONTHLY CALENDAR MODE

Implement a traditional seven-column calendar grid.

The grid must represent weekdays in the configured order, with Monday as the default first day.

The number of calendar rows must be determined automatically by the month and weekday arrangement.

Support four-, five-, and six-week layouts.

The entire calendar grid must maintain a consistent configured height, while individual weekly rows dynamically adjust their height to fill that area.

If weekday headers are enabled, their height must be handled separately from the date rows.

Provide an option to display previous-month and next-month dates in otherwise empty cells using a subdued visual style.

Alternatively, users must be able to keep those cells empty.

Provide three selectable weekday label styles: full Hungarian weekday names, abbreviated names, and single-letter abbreviations.

The labels must update correctly when the selected first weekday changes.

MONTH TITLE AND POSITIONING

Display the month title above the monthly calendar grid.

Provide left, center, and right horizontal alignment.

Allow precise vertical offset adjustments between the month title and the grid.

Provide independent font family, font size, weight, color, letter spacing, and capitalization settings.

Use correct Hungarian month names and accented characters.

MONTHLY CELL CONTENT

Each date cell must contain a structured upper area and a lower area reserved primarily for handwritten notes.

Display the date number in the upper part of the cell.

Allow the date number to be aligned independently to the left or right.

Display up to two official Hungarian namedays near the date number.

Nameday alignment must be independently configurable.

Namedays may wrap when necessary, but text must not overlap the date number.

Keep the remaining cell area blank for handwritten notes after printing.

Do not implement unrestricted digital note-taking as the primary purpose of the empty writing area.

Personal birthday and nameday events may appear in the area below the date number and official namedays, while preserving as much handwriting space as possible.

MONTHLY GRID STYLING

Allow users to configure calendar width, total height, cell padding, grid line thickness, grid line color, outer border thickness, outer border color, outer border corner radius, cell background color, and weekend/public holiday highlighting.

Avoid doubled borders between adjacent cells.

Ensure rounded outer corners are rendered cleanly and do not corrupt inner grid lines.

All configured dimensions and border thicknesses must be consistently reflected in the exported documents.

Support A4, A5, and A6 paper sizes, each in portrait and landscape orientation.

Also support custom page dimensions entered in millimeters.

Provide separate width and height fields with validation and appropriate limits.

PERSONAL BIRTHDAYS

Implement annual recurring birthday events.

Required input fields are first name, birth month, and birth day.

Birth year must be optional.

When the birth year is provided, offer an option to display the person's age for the calendar year.

Display birthdays within the appropriate date cell using a cake icon followed by the first name and optionally the calculated age.

Do not display negative ages or birthday occurrences before the person's birth date.

Handle February 29 birthdays in non-leap years using a configurable observance policy, allowing February 28 or March 1.

Store this setting in the project.

PERSONAL NAMEDAYS

Implement annually recurring personal nameday events.

Required fields are first name, month, and day.

Display a flower icon followed by the person's first name.

Personal namedays must appear separately from the standard nameday labels.

Use unique identifiers for personal event records so multiple people with identical first names can be stored independently.

EVENT ENTRY AND MANAGEMENT

The primary method of adding personal events must be clicking the corresponding calendar date cell.

Open a clear and compact event editor or modal.

Allow selection between birthday and personal nameday.

Provide the relevant fields and working save, edit, delete, and cancel controls.

Existing events must be editable by clicking their corresponding date cell or event entry.

Avoid enormous forms with hundreds of visible inputs.

Within the date editor, display the personal events associated with that date and allow new entries to be added individually.

A secondary searchable event overview is acceptable for managing larger collections, but the primary entry experience must remain calendar-cell-based.

Only birthday and nameday personal event types are required. Do not add unrelated event categories unless essential to the architecture.

EVENT OVERFLOW MANAGEMENT

Detect when a date cell contains more text or personal events than can fit.

Do not silently hide events, cut off names, or export missing information.

Display a clear warning and offer appropriate solutions, such as reducing the event font size, changing text wrapping, shortening displayed labels, or explicitly hiding selected events.

The user's choice must be respected in the final export.

GOOGLE FONTS AND TYPOGRAPHY

Provide a searchable selection of Google Fonts.

Only expose fonts and font variants that correctly support all Hungarian accented characters, including á, é, í, ó, ö, ő, ú, ü, ű and their uppercase equivalents.

Verify actual glyph coverage rather than trusting font naming or broad language labels.

Allow separate typographic settings for the year number, month names, weekday labels, date numbers, official namedays, birthday labels, and personal nameday labels.

For each relevant text category, support font family, size, weight, color, letter spacing, alignment, and line height where applicable.

Use real font loading and ensure accurate text measurement.

Do not begin an export until required font resources are available.

Handle missing font resources gracefully, without silently substituting fonts in a way that changes layout.

Ensure font licensing permits the intended use and embedding.

Where possible, embed appropriate font subsets in PDFs.

VISUAL DESIGN EDITOR

Implement a sophisticated but intuitive desktop-oriented editing interface.

Use a three-panel layout.

The left panel should provide primary configuration, including calendar mode, year/month selection, paper size, orientation, template selection, events, backgrounds, and photographs.

The central workspace should contain a zoomable, interactive WYSIWYG calendar canvas.

The right panel should expose the properties of the selected element, including position, dimensions, font settings, colors, alignment, borders, margins, corner radius, and image controls.

Provide both Simple and Advanced editing modes.

Simple mode should expose the most commonly used controls.

Advanced mode should provide precise access to all supported properties.

Choose the most appropriate control type for each property, including dropdowns, searchable selectors, segmented controls, numeric fields, sliders, toggles, and color pickers.

Use input constraints, meaningful defaults, and clear units.

Allow direct mouse-based selection, dragging, and resizing of editable elements.

Also allow exact positioning and dimensions in millimeters.

Implement snapping, alignment guides, center alignment, aspect-ratio locking, layer ordering, and optional element locking where appropriate.

Do not allow free-form editing to damage the underlying date calculation or logical calendar structure.

WYSIWYG PREVIEW

All edits must update the visual preview immediately or with a suitably responsive rendering strategy.

Support zooming, fit-to-page, margin guides, alignment guides, and print preview.

Preview zoom must not affect actual physical page dimensions or exported resolution.

Editing guides must not appear in exported files.

Provide warnings when elements exceed the printable page area or overlap unintentionally.

The exported document must match the preview in layout, geometry, text positioning, colors, borders, and image placement within documented rendering tolerances.

IMAGES, BACKGROUNDS, LOGOS, AND WATERMARKS

Support customizable backgrounds in both annual and monthly modes.

Allow solid colors, uploaded images, decorative patterns, logos, and optional watermarks.

Support common raster image formats, including JPG, PNG, and WebP where supported by the browser.

Validate file types, decoded image contents, and image dimensions.

Do not execute code from user-uploaded files.

Provide non-destructive image cropping and transformations.

Keep original images separate from editable crop and transformation settings.

Implement appropriate document layers for backgrounds, decorations, photographs, calendar content, logos, and watermarks.

Allow reasonable layer ordering while maintaining the integrity of required calendar content.

PREDEFINED STYLES AND CUSTOM TEMPLATES

Provide visually coherent built-in designs such as Minimalist, Modern, Elegant, Pastel, Black and White, and Photo Calendar.

These must be genuine coordinated design presets, not merely different background colors.

Allow users to save their customized layout as a reusable template.

Templates must preserve appearance-related settings, including page dimensions, orientation, typography, colors, spacing, borders, layout parameters, and supported background configuration.

A template must be reusable for another year.

When the year changes, recalculate all weekdays, month layouts, holidays, and recurring events while maintaining the chosen visual design.

Distinguish templates from complete calendar projects.

For monthly calendars, implement a common base style shared by all 12 months.

Allow individual months to override selected properties without unnecessarily duplicating the complete style configuration.

Changes to global styles must continue to affect properties that have not been individually overridden.

EXPORT ENGINE

Implement fully functional JPG, PNG, and PDF exports.

Raster exports must use a fixed resolution of 300 DPI.

Do not expose a selectable DPI setting.

Use physical millimeter dimensions as the source of truth.

Calculate raster dimensions using:

pixels = millimeters / 25.4 × 300

Round pixel dimensions appropriately.

For reference, standard portrait paper sizes at 300 DPI approximately correspond to:

A4: 2480 × 3508 pixels.\
A5: 1748 × 2480 pixels.\
A6: 1240 × 1748 pixels.\
A7: 874 × 1240 pixels.

Generate raster exports directly at their target resolution rather than capturing the zoomed browser preview.

JPG export must provide high-quality compression, correct aspect ratio, accurate colors, and appropriate background compositing.

PNG export must be lossless, preserve appropriate transparency, and use the correct pixel dimensions.

Use sRGB consistently for raster output.

Where technically supported, write appropriate 300 DPI resolution metadata. Do not confuse pixel dimensions with embedded DPI metadata.

PDF documents must use exact physical page dimensions.

Preserve vector text and vector lines wherever technically possible.

Embed fonts correctly and preserve all Hungarian accented characters.

Use sufficiently high-resolution photographs.

Do not introduce unnecessary rasterization of text or table geometry.

Do not include printing bleed or crop marks.

PDF, JPG, and PNG exports must use the same underlying document geometry.

MONTHLY MULTI-PAGE EXPORT

Allow the user to export one selected monthly calendar or all 12 months.

For PDF, generate a single 12-page document when exporting the full year.

For JPG and PNG, export separate images for each month and package the resulting files into a downloadable ZIP archive.

ZIP is only a packaging mechanism and must not be treated as an additional calendar format.

EXPORT VALIDATION

Before exporting, verify page dimensions, font readiness, image availability, effective image resolution, text overflow, hidden content, invalid date structures, and estimated memory requirements.

Provide user-friendly Hungarian error and warning messages.

Large exports must not silently fall back to lower resolution.

If browser memory or canvas limits prevent a requested export, explain the limitation and provide an appropriate alternative, such as exporting individual pages.

SHARED DOCUMENT MODEL AND RENDERING

Implement a canonical document model containing the geometry and styling of all visual elements.

Each relevant element should contain an identifier, type, position, dimensions, layer order, style, content, visibility, and any supported transformations.

Use millimeters or a precise document-space coordinate system derived from millimeters for internal geometry.

Build a common layout engine that serves both screen preview and export renderers.

Do not independently reconstruct calendar geometry in each export function.

Use reliable font measurement and line-breaking strategies.

Implement visual regression tests to detect unacceptable differences between preview and export.

PROJECT SAVING AND LOADING

The application must be publicly usable without accounts.

The primary long-term storage method must be downloadable project files.

Implement versioned, JSON-based project serialization.

Include all required settings, personal events, nameday overrides, monthly style overrides, image references, image data or associated bundled assets, and template configuration.

A saved project must be portable between computers.

Use either a fully self-contained JSON document or a structured project package containing a JSON manifest and necessary assets.

Never rely solely on temporary browser blob URLs when saving a project.

Validate imported project files using a strict schema.

Reject or safely handle malformed, unsupported, and potentially malicious content.

Maintain backward compatibility through versioned migrations where practical.

LOCAL AUTOSAVE AND RECOVERY

Although project files are the primary permanent storage method, implement temporary browser-local autosave for recovery.

IndexedDB is recommended for handling substantial project data and images.

Autosave should be debounced to avoid unnecessary writes.

On reopening the application, offer to restore a recoverable local working session.

Clearly distinguish local recovery from permanent file-based backups.

Handle storage quota errors and unavailable local storage without crashing.

UNDO, REDO, AND WORKFLOW OPERATIONS

Provide functional Undo and Redo covering meaningful editing actions.

Support project duplication, new project creation, project import, project export, template saving, template loading, and recovery.

Use appropriate keyboard shortcuts, including Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z, and Ctrl+S.

Ensure that undo history does not grow without reasonable memory management.

USER INTERFACE AND EXPERIENCE

All interface labels, menus, tooltips, validation messages, and documentation intended for end users must be in Hungarian.

The interface must feel like a professional calendar design studio rather than a generic administration dashboard.

A typical workflow should be:

Create a project, choose annual or monthly mode, select a year and month if relevant, choose paper size and orientation, apply a design template, customize the layout, add photographs and personal events, inspect the preview, save the project, and export the final calendar.

Provide clear progress indicators for longer operations.

Use accessible input labels, keyboard navigation where practical, readable text contrast, and useful error messages.

Optimize primarily for desktop displays.

Full mobile and tablet editing support is not required. On smaller screens, provide an appropriate explanatory state rather than a broken interface.

PERFORMANCE REQUIREMENTS

Calendar calculations and visual updates should remain responsive during normal editing.

Cache reusable date computations.

Avoid unnecessary component rerenders.

Use efficient image processing and resource management.

Load fonts intelligently.

Separate expensive export calculations from interactive editing operations.

Avoid excessive memory consumption with large image assets.

Release temporary resources when no longer required.

Use Web Workers when they provide meaningful responsiveness improvements.

AUTOMATED TESTING

Implement comprehensive unit, integration, browser, and export tests.

Use Vitest or equivalent tooling for mathematical and business-logic tests.

Use Playwright or equivalent tooling for end-to-end behavior.

The date engine must be tested for years 1, 99, 100, 400, 1900, 2000, 2024, 2025, 2026, 2100, 2400, and 9999.

Validate leap years, month lengths, weekday alignment, calendar rows, and year-boundary behavior.

Use an independently implemented reference calculation to test weekdays and exploit the Gregorian 400-year cycle for broad correctness coverage.

Validate Easter against independently verified examples:

March 31, 2024.\
April 20, 2025.\
April 5, 2026.\
March 28, 2027.

Validate Easter Monday and both Pentecost dates using exact day offsets.

Test the difference between verified historical holiday rules and explicitly labeled projections.

Test monthly layouts with four, five, and six week rows.

Test Monday-first and Sunday-first arrangements.

Test nameday formatting, long names, accented characters, text wrapping, and user-defined overrides.

Test birthday recurrence and February 29 handling.

Test event overflow warnings.

Test annual three-column/four-row positioning.

Test custom page sizes, portrait and landscape layouts, rounded borders, image cropping, and style overrides.

Test exporting an A4 JPG at 300 DPI, an A5 PNG at 300 DPI, an A6 PDF with exact physical dimensions, and an A7 annual calendar.

Test full-year monthly export as a 12-page PDF and a ZIP containing 12 images.

Validate that changes in preview zoom do not affect exported dimensions.

Test project save/load round trips, including embedded photographs and personal events.

Perform visual regression testing for important representative layouts.

Test production builds and GitHub Pages path handling.

Run browser-based tests in current Chrome, Firefox, and Edge where supported by the development environment.

Document any tests that could not be executed rather than claiming they passed.

IMPLEMENTATION WORKFLOW

First, inspect the available development environment and existing repository.

Identify existing files, dependencies, branches, configuration, and deployment workflows before making changes.

Provide a concise architecture and implementation plan, then begin actual coding.

Implement the project in coherent stages:

1. Repository setup and technical architecture.
2. Deterministic calendar date engine.
3. Hungarian holiday and nameday data handling.
4. Shared document and layout models.
5. Annual and monthly calendar rendering.
6. Desktop visual editor and typography controls.
7. Photo editing, backgrounds, and templates.
8. Birthday and personal nameday editing.
9. Project serialization, autosave, and Undo/Redo.
10. JPG, PNG, PDF, and multi-page export.
11. Automated testing and visual verification.
12. Production build and GitHub Pages deployment.

At every stage, verify that previously implemented functionality still works.

Do not stop after creating the project skeleton or visual interface.

Do not abandon difficult features by leaving non-functional placeholders.

If the complete implementation exceeds the available execution context, preserve a coherent, working project state, accurately document completed and incomplete work, and continue in the next available development session rather than falsely declaring completion.

GITHUB PAGES DEPLOYMENT

The project must include a functioning production build pipeline and a GitHub Actions workflow suitable for GitHub Pages.

Handle both user-site and repository-site deployment configurations appropriately.

Use repository-aware base paths.

Ensure direct navigation and asset loading work with the chosen routing strategy.

Do not require server-side route rewrites unavailable on GitHub Pages.

Ensure Google Fonts, images, scripts, stylesheets, and downloadable exports work in production.

Document how to connect the repository, configure GitHub Pages, run builds, and deploy updates.

Do not claim a successful live deployment unless the deployment has actually been performed and verified.

SECURITY AND RELIABILITY

Treat imported project files, images, text values, and external font metadata as untrusted input.

Validate file structures, file types, and reasonable resource limits.

Prevent code execution or HTML injection through user-generated content.

Do not store sensitive credentials in the repository or client application.

Avoid collecting personal event information on an external server.

Ensure personal names, birthdays, and photographs remain browser-local unless the user explicitly exports or shares a project file.

Provide understandable failure handling for missing assets, corrupted files, unsupported browsers, excessive memory use, and failed exports.

Do not silently discard user data.

MANDATORY ACCEPTANCE SCENARIOS

Scenario A: A user creates a 2027 annual calendar in A4 landscape orientation. All 12 months appear in a correct three-column/four-row grid, weekday alignment is correct, and holidays use the selected highlighting style. The result exports successfully.

Scenario B: A user creates an A6 photo calendar with an A7-sized annual calendar area and a separate photograph. The photograph can be repositioned, cropped, framed, and exported without distortion.

Scenario C: A user creates a March 2027 monthly calendar in A4 portrait orientation. They adjust the month title, grid dimensions, border thickness, border color, corner radius, date alignment, and nameday typography. The result preserves blank handwriting space and exports correctly.

Scenario D: A user clicks a date cell, adds Anna's birthday with an optional birth year, and enables age display. The entry appears with a cake icon and recurs correctly in following years.

Scenario E: A user adds a personal nameday. It appears with a flower icon, separate from official namedays, on the correct date.

Scenario F: A user uploads photographs, customizes fonts and colors, saves the complete project, closes the application, reloads it, imports the project, and recovers all settings and assets.

Scenario G: A user exports a complete year of monthly calendars as a 12-page PDF or as 12 separate JPG/PNG files in a ZIP package.

Scenario H: The application loads correctly from its GitHub Pages URL, supports all editing workflows without a dedicated backend, and produces working downloadable exports.

Scenario I: A user selects a historically unsupported year. The application remains mathematically accurate and clearly distinguishes verified holiday information from a modern-rules projection.

DELIVERABLES

Deliver the complete working application and its source code.

Include all required configuration files, dependency manifests, lockfiles, data models, date algorithms, holiday rules, nameday data and source information, editor components, export functionality, project management, GitHub Actions workflows, automated tests, and documentation.

Provide a README.md explaining installation, local development, testing, production builds, GitHub Pages configuration, and deployment.

Provide a Hungarian user guide explaining how to create calendars, edit styling, add events, save projects, and export documents.

Include information about third-party libraries, fonts, data sources, licenses, and known limitations.

At completion, provide an accurate technical summary stating which features were implemented, which files were created or modified, which tests were executed successfully, what remains incomplete, and how to run and deploy the application.

NON-NEGOTIABLE QUALITY STANDARDS

The following are unacceptable:

Incorrect weekday calculations, incorrect leap-year handling, incorrect Easter or Pentecost dates, fabricated nameday information, historically unsupported holiday claims presented as facts, corrupted Hungarian characters, broken image handling, incomplete project recovery, hidden event loss, visually mismatched exports, false 300 DPI claims, inaccurate page dimensions, non-functional controls, unhandled critical errors, and features declared complete without real implementation.

Never substitute screenshots of the editor for a properly rendered print export.

Never silently downscale output to avoid memory limitations.

Never conceal missing functionality.

Never report successful tests that were not actually run.

Do not make the user repeatedly confirm decisions already defined in this specification.

Use professional engineering judgment for unspecified details, and document decisions that affect correctness, interoperability, or future maintenance.

FINAL INSTRUCTION

Build this application as a complete, extensible, production-quality Hungarian calendar design studio.

Prioritize mathematical correctness, precise print output, reliable project portability, an intuitive desktop editing experience, and maintainable architecture.

Start by examining the development environment and repository. Briefly establish the implementation architecture, then proceed with actual file creation, implementation, verification, and deployment preparation.

The expected result is a genuinely usable application, not a concept, mockup, or unfinished prototype.

Begin implementation now.