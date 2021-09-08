COVID-19 Excess Visualisation
=============================

Requirements
------------

* [Node.js](https://nodejs.org) is required to download the latest data and
  compress it, and also to bundle the source code into a single file for the
  application.

* The front-end application requires a recent, "modern" browser, e.g. Google
  Chrome, Safari, Mozilla FireFox, or Microsoft Edge.

Build Instructions
------------------

Run the following to install dependencies:

    npm install
    npm install -g serve

Run the following to bundle the code into a single file:

    npm run build

Downloading and Compressing Data
--------------------------------

Run the following to update `data.csv`:

    node compress-data.js

Additional Notes
----------------

The five year average is generated using [Harry Giles](https://github.com/henryjon)' script, `download-averages.R`, which generates two files:

* `Occurrences_five_year_average.csv`
* `Registrations_five_year_average.csv`

These are then compressed into `five-year-average.js` by running:

    node compress-five-year-average.js

These files shouldn't need to be updated, but if they do, the above compression should be run, followed by `npm run build` to rebuild the bundle.
