const credentials = require("./credentials.js");
const puppeteer = require('puppeteer');
const { google } = require("googleapis");
const path = require('path');

const progressTrackerEmail = credentials.aAemail;
const progressTrackerPassword = credentials.aApassword;

async function loginPT(page, cohortNumber) {
    const progressTrackerAttendanceUrl = `https://progress.appacademy.io/cycles/${cohortNumber}/attendances`;
    console.log('Visiting Progress Tracker...');
    await page.goto(progressTrackerAttendanceUrl);
    console.log('Logging into Progress Tracker...');
    await page.type('[id=instructor_email]', progressTrackerEmail);
    await page.type('[id=instructor_password]', progressTrackerPassword);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({
        waitUntil: 'networkidle0'
    })
    return page;
}

async function checkAttendance(page) {
    const studentList = await page.evaluate(() => { 
        let attendanceObj = {};
        let studentButtons = Array.from(document.getElementsByClassName('check-ins')[0].getElementsByTagName('form'));
        studentButtons.forEach((ele) => {
            let formButton = ele.getElementsByTagName('fieldset')[0];
            let studentName = formButton.getElementsByTagName('label')[0].innerText.split(' - ')[0].split('\n')[0];
            if (formButton.className === 'present') {
                attendanceObj[studentName] = true;
            } else {
                attendanceObj[studentName] = false;
            }
        });
        return attendanceObj;
    });
    return studentList;
}

async function checkMorningLunchAfternoon(page) {
    let daysAttendance = {};
    
    const currentDay = await page.evaluate(() => { 
        let dayDropdown = document.getElementById('day_id');
        return dayDropdown.options[dayDropdown.selectedIndex].text;
    });
    daysAttendance[currentDay] = {};

    console.log('Checking Attendance...');
    await page.evaluate(() => { 
        let morningButton = document.getElementsByClassName('top-bar')[0].getElementsByTagName('a')[0];
        morningButton.click();
    });
    await page.waitForNavigation(2000);

    let morningAttendance = await checkAttendance(page);
    daysAttendance[currentDay]['morning'] = morningAttendance;
    await page.evaluate(() => { 
        let lunchButton = document.getElementsByClassName('top-bar')[0].getElementsByTagName('a')[1];
        lunchButton.click();
    });
    await page.waitForNavigation(2000);

    let lunchAttendance = await checkAttendance(page);
    daysAttendance[currentDay]['lunch'] = lunchAttendance;
    await page.evaluate(() => { 
        let afternoonButton = document.getElementsByClassName('top-bar')[0].getElementsByTagName('a')[2];
        afternoonButton.click();
    });
    await page.waitForNavigation(2000);

    let afternoonAttendance = await checkAttendance(page);
    daysAttendance[currentDay]['afternoon'] = afternoonAttendance;

    // console.log(daysAttendance);
    return daysAttendance;
}

// Old input BPSS function using puppeteer:
// async function inputBPSS(data){
//     const browser = await puppeteer.launch({headless: true});
//     console.log('Visiting Google...');
//     const page = await browser.newPage();
//     await page.goto(credentials.gURL);
//     console.log('Logging into Google...');
//     await page.type('[id=identifierId]', credentials.gEmail);
//     await page.keyboard.press('Enter',{delay:2000});
//     // const passwordInput = await page.$$('input[name=Passwd]');
//     await page.type('input[name=Passwd]', credentials.gPassword);
//     await page.keyboard.press('Enter',{delay:2000});
//     console.log('Logged in to Google.')
//     return page;
// }

async function inputBPSS(attendanceData, spreadsheetId) {
    console.log('Inputting attendance in google sheets...')
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, "google_creds.json"),
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: client });
    // const spreadsheetId = "1DAy53KtQw95bZ5DqgpnEJq7fnDJT5O3RC_F0jfiIz-g";
    let week = Object.keys(attendanceData)[0].split('d')[0].split('w')[1];
    let sheetNumber;

    switch (week) {
        case '1':
        case '2':
            sheetNumber = '1';
            break;
        case '3':
        case '4':
            sheetNumber = '3';
            break;
        case '5':
        case '6':
            sheetNumber = '5';
            break;
        case '7':
        case '8':
            sheetNumber = '7';
            break;
        case '9':
        case '10':
            sheetNumber = '9';
            break;
        case '11':
        case '12':
            sheetNumber = '11';
            break;
        case '13':
        case '14':
            sheetNumber = '13';
            break;
        case '15':
        case '16':
            sheetNumber = '15';
            break;
        default:
            console.log('Error: wrong week number.');
    }

    let day = Object.keys(attendanceData)[0].split('d')[1];
    let startingCol;

    switch (true) {
        case week % 2 != 0 && day == 1:
            startingCol = 'E';
            break;
        case week % 2 != 0 && day == 2:
            startingCol = 'H';
            break;
        case week % 2 != 0 && day == 3:
            startingCol = 'K';
            break;
        case week % 2 != 0 && day == 4:
            startingCol = 'N';
            break;
        case week % 2 != 0 && day == 5:
            startingCol = 'Q';
            break;
        case week % 2 == 0 && day == 1:
            startingCol = 'T';
            break;
        case week % 2 == 0 && day == 2:
            startingCol = 'W';
            break;
        case week % 2 == 0 && day == 3:
            startingCol = 'Z';
            break;
        case week % 2 == 0 && day == 4:
            startingCol = 'AC';
            break;
        case week % 2 == 0 && day == 5:
            startingCol = 'AF';
            break;
        default:
            console.log('Error: wrong day number.');
    }

    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `${sheetNumber}!B11:B50`,
    });
    const studentArr = getRows.data.values;
    const gooogleSheetStudentsIndexes = {};
  
    for (let i = 0; i < studentArr.length; i++) {
        gooogleSheetStudentsIndexes[studentArr[i][0]] = i;
    }
    let morning = Object.values(attendanceData)[0].morning;
    let lunch = Object.values(attendanceData)[0].lunch;
    let afternoon = Object.values(attendanceData)[0].afternoon;

    let formattedAttendanceData = [];
    for (const student in gooogleSheetStudentsIndexes) {
        formattedAttendanceData.push([(morning[student] || false), (lunch[student] || false), (afternoon[student] || false)]);
    }
    

    await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `${sheetNumber}!${startingCol}11:AH50`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: formattedAttendanceData
        },
    });
}

async function updateAttendance(cohortNumber, googleSheetsId){
    console.log('Opening Virtual Browser...');
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    const loggedInPT = await loginPT(page, cohortNumber);
    const attendanceData = await checkMorningLunchAfternoon(loggedInPT);
    console.log('Closing Virtual Browser...');
    await page.close();
    await browser.close();
    await inputBPSS(attendanceData, googleSheetsId);
    console.log('Done!');
}

updateAttendance('309', '1DAy53KtQw95bZ5DqgpnEJq7fnDJT5O3RC_F0jfiIz-g');
updateAttendance('310', '14NWBUaVkakVHFXkJile3srQcZ9UZdPDzZS-wwvX7DQU');