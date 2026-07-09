# Scriptable Widgets

Personal workout tracking on the iOS home screen, built with [Scriptable](https://scriptable.app).

<!-- TO ADD: widget screenshot + logger screenshot side by side -->

## Workout tracker

`habitTrackerWidget.js` draws a 7×52 dot grid covering a rolling 364-day cycle: green for done, white for missed, a ring on today, and a streak count. Tapping it opens `workoutLogger.js`, which adapts to the day's state: a plan view with today's template, a checklist with per-exercise notes and extras, or a review of the saved session with undo.

## Install

1. In Scriptable, create two scripts named exactly `habitTrackerWidget` and `workoutLogger`, and paste in the matching files. The names matter: the widget opens the logger by name.
2. Add a Scriptable widget to your home screen and point it at `habitTrackerWidget`.

## Customize

Each file has a marked CONFIG block at the top: workout templates (the included ones are examples), the weekday-to-template mapping, the done rule (`max(2, ceil(items/3))` exercises checked, or any extra logged), grid size, and colors.

## Data

Everything stays on device in Scriptable's local storage (`Habits/log.json`), written atomically so an interrupted save can't corrupt the log. An existing iCloud log is imported once if found.

## Notes

Helper functions are duplicated across both files on purpose: Scriptable scripts are self-contained paste-in files with no imports. The test suite (`npm test`, Node 20) covers the date and done-rule logic, and includes jsdom regression tests that keep the old innerHTML-based render around as a failing-by-design case to document the injection bug the current createElement render fixes.