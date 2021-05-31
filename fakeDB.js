const fakeDB = {};

fakeDB.insert = async (jobs) => {
  // The db makes some work, don't edit this vv
  console.log("Inserting jobs to db");
  if (!jobs || jobs.length == 0) throw "The DB throws an error !";
  let companySite = jobs.map(job => job.company.website);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a second to fake db operations
  let newJobs = jobs.length > 10 ? jobs.slice(0, Math.round(jobs.length / 2)) : jobs // The newJobs are the jobs that are not duplicates from the db - here they are random
  // You can edit from here vv
  jobs.forEach(job => {
    console.log('\n');
    console.log('Job Id: ' + job._id);
    console.log('Company name: ' + job.company.title);
    console.log('Company website: ' + job.company.website);
    console.log('Location: ' + job.location);
    console.log('Position name: ' + job.cleanTitle);
    console.log('Position type: ' + job.type);
    console.log('Source: ' + job.source + job.link);
  });
};

module.exports = fakeDB;