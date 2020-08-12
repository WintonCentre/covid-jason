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

Run the following to bundle the code into a single file:

    npm run build

Downloading and Compressing Data
--------------------------------

Run the following to update `data.csv`:

    node compress-data.js

Downloading and Compressing Data
--------------------------------
To deploy on Netlify, check in and push changes to master. This currently deployes on a free gmp26@cam.ac.uk account there to [this URL](https://amazing-ride-4051de.netlify.app).

Additional Notes
----------------

Notes from [Harry Giles](https://github.com/henryjon):

* `five-year-average.csv` comes from [here][1].
* `adjustment-factor.csv` will not need recalculating. You can consider it a hard-coded value that will not change. It was generated by regressing deaths in the first 10 weeks of 2020 onto the first 10 weeks of 2015-2019.

[1]: https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/adhocs/11622fiveyearaverageweeklydeathsbyplaceofdeathenglandandwalesdeathsoccurringbetween2015and2019