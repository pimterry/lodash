var port = 8081;

// Create a web server for the local dir
var connect = require('connect');
var server = connect.createServer(
    connect.static(__dirname)
).listen(port);

// Tell saucelabs to run some tests
var browser = JSON.parse(process.env['SAUCE_BROWSER']);
var username = process.env['SAUCE_USERNAME'];
var accessKey = process.env['SAUCE_ACCESS_KEY'];

var request = require('request');

request.post(
    'https://saucelabs.com/rest/v1/' + username + '/js-tests',
    {
        auth: { user: username, pass: accessKey },
        json: {
            platforms: [ browser ],
            url: "http://localhost:" + port + "/test/index.html",
            framework: "qunit"
        }
    },
    function (error, response, body) {
        if (response.statusCode == 200) {
            var testIdentifier = body;
            waitForTestCompletion(testIdentifier);
        } else {
            console.error(typeof response.statusCode);
            throw "Failed to submit test to SauceLabs, status " + response.statusCode + ", body:\n" + JSON.stringify(body);
        }
    }
);

function waitForTestCompletion(testIdentifier) {
    request.post(
        'https://saucelabs.com/rest/v1/' + username + '/js-tests/status',
        {
            auth: { user: username, pass: accessKey },
            json: testIdentifier
        },
        function (error, response, body) {
            if (response.statusCode == 200) {
                console.log(JSON.stringify(body));
                if (body["completed"] == true) {
                    handleTestResults(body["js tests"]);
                } else {
                    waitForTestCompletion(testIdentifier);
                }
            } else {
                throw "Failed to check test status on SauceLabs, status " + response.statusCode + ", body:\n" + JSON.stringify(body);
            }
        }
    );
}

function handleTestResults(results) {
    var allTestsSuccessful = results.reduce(function (passedSoFar, result) {
        return passedSoFar && !!result['passed']
    }, true);

    console.log(allTestsSuccessful ? "Test passed" : "Test failed");
    process.exit(allTestsSuccessful ? 0 : 1);
}