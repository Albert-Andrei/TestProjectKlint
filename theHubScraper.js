const axios = require('axios');
const cheerio = require('cheerio');
const docDB = require('./fakeDB.js');
const subs = require('./substring.js');
const theHub = {};
const origin = 'The Hub';
const domainUrl = 'https://thehub.io';
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/* TO DO, you can modify every file and add some, BY ORDER OF IMPORTANCE
Done 1 - Solve the issue that fails most of the http requests
Done 2 - Verify the integrity of the data before sending it to the db to avoid inserting jobs with fields missing for example and triggering errors
Done 3 - (If too long you can skip) Set a maximum delay of 10s for the job http requests, so the promise gets rejected after 10s of waiting
Done 4 - Get the name and the link of the company
Done 5 - Create a unique ID for the job (used in the No Sql DB), you can use whatever you want, justify your choice
Done 6 - Define a cleanTitle by removing what is in parenthesis (regexp)
Done 7 - Define it in a separate file that you import (do it even if you can't make the feature)
Done 8 - Set the date of every job to 15 days ago, MM/DD if possible or any format (there are easy ways)
Done 9 - Save the json of the jobs scraped in the root folder
Done 10 - Log the result in a clean way - your choice (you can change fakeDB.js)
Done 11 - Remove the /n from the description of the job
*/

// Extract all job links from url
theHub.getJobLinks = async (scrappages) => {
  const links = [];
  let page = 1;
  let $;
  let url = domainUrl + "/jobs?countryCode=DK";

  // Goes through all pages and gets down all links
  do {
    console.log("- Page " + page);
    const pageHtml = (await axios.get(url + "&page=" + page)).data;
    $ = cheerio.load(pageHtml);
    $('.card-job-find-list__link').each((i, e) => {
      links.push(e.attribs.href);
    });
    page += 1;
  }
  while (page <= scrappages);
  console.log("Pages links scraped");
  return links;
};

// Extract data from job links
theHub.getJobDetails = async (jobLink) => {
  try {
    const job = {};
    const jobPageHtml = await new Promise((resolve, reject) => {
      axios.get(domainUrl + jobLink, { timeout: 10000 })
        .then(get => resolve(get.data))
        .catch(e => reject(e.message + ' ' + domainUrl + jobLink));
    });
    let $ = cheerio.load(jobPageHtml);

    job.title = $('h2').text();
    job.link = jobLink;
    job.country = "DK";
    job.source = domainUrl;

    function removeLinebreaks(string) {
      return string.replace(/\r?\n|\r/g, '');
    }

    job.description = removeLinebreaks($('.view-job-details__body').text().trim());

    job.location = $('.bullet-inline-list.text-gray-700').children().eq(1).text().trim();
    job.type = $('.bullet-inline-list.text-gray-700').children().eq(2).text().replace(/-/g, '').toLowerCase();
    job.company = {
      // TODO : Get the name and the link of the company, bonus if able to get the logo
      link: $('.bullet-inline-list.text-gray-700').children().eq(0).attr('href'), // Fake link for the program to work
      title: $('.bullet-inline-list.text-gray-700').children().eq(0).text().trim()
    }

    //Scraping the company page
    const companyPageHtml = (await axios.get(domainUrl + job.company.link)).data;
    $ = cheerio.load(companyPageHtml);

    $table = $('.key-value-list').children().eq(0); // <tbody>
    job.company.location = $table.children().eq(0).children().eq(1).text();
    job.company.website = $table.children().eq(1).children().eq(1).text();
    delete job.company.link;

    // TODO : Set the date of 15 days ago, MM/DD if possible or any format

    var date = new Date();
    date.setDate(date.getDate() - 13);

    // console.log(date);

    var dd = date.getDate();

    var mm = date.getMonth() + 1;

    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0' + mm;
    }
    requiredDate = mm + '/' + dd;
    // console.log(requiredDate);
    job.date = requiredDate; // Goal

    // TODO : Create a unique ID for the job (used in the No Sql DB), you can use whatever you want, justify your choice here :
    /*
    Reason: 

    To have an auto generated universally unique identifier.
    */
    job._id = uuidv4();

    // TODO : Define a cleanTitle by removing what is in parenthesis (regex)
    // TODO : Bonus if you do it in a separate file that you import and you call the function here

    console.log(subs.sub(job.title));
    job.cleanTitle = subs.sub(job.title);

    console.log("job done");
    return job;
  } catch (e) {
    console.log(e);
  }
};

// Runs all functions
theHub.main = async (scrappages) => {
  console.log('------------------------------------------------');
  console.log(`Started scraping ${origin}`);

  // Scraping Jobs & their links
  console.log('Getting job links');
  const jobLinks = await theHub.getJobLinks(scrappages);
  console.log(jobLinks.length + " job links found");
  // Creating every promise for job details scraping
  console.log('Getting job details');
  const jobPromises = [];

  for (let i in jobLinks) { // Creating the job promises
    const jobPromise = await theHub.getJobDetails(jobLinks[i]);
    jobPromises.push(jobPromise);
  }

  // Goes through all promises and resolves them
  const newJobs = Promise.all(jobPromises)
    .then(async jobs => {
      // Uploading to the DB and getting the new jobs
      await docDB.insert(jobs);

      const dataAsJson = JSON.stringify(jobs);

      fs.writeFile('jobs.json', dataAsJson, (err) => {
        if (err) {
          throw err;
        }
        console.log("JSON data is saved.");
      });

      console.log("Finished");// TODO : display the result in a clean way
    })

  return newJobs;
};

module.exports = theHub;