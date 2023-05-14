const sdk = require("node-appwrite");
const https = require("https");
const querystring = require("querystring");

/*
  'req' variable has:
    'headers' - object with request headers
    'payload' - request body data as a string
    'variables' - object with function variables

  'res' variable has:
    'send(text, status)' - function to return text response. Status code defaults to 200
    'json(obj, status)' - function to return JSON response. Status code defaults to 200

  If an error is thrown, a response with code 500 will be returned.
*/

module.exports = async function (req, res) {
  const client = new sdk.Client();

  const databaseID = "642022e1e1bf13aa04b9";
  const collectionID = {
    reminders: "642023bce66fe86cc9c8",
  };

  if (
    !req.variables["APPWRITE_FUNCTION_ENDPOINT"] ||
    !req.variables["APPWRITE_FUNCTION_API_KEY"]
  ) {
    console.log(
      "Environment variables are not set. Function cannot use Appwrite SDK."
    );
  } else if (
    !req.variables["ZULIP_BOT_EMAIL_ADDRESS"] ||
    !req.variables["ZULIP_BOT_API_KEY"] ||
    !req.variables["ZULIP_PERSONAL_EMAIL"]
  ) {
    console.log(
      "Environment variables are not set. Function cannot call Zulip Chat REST API."
    );
  } else {
    client
      .setEndpoint(req.variables["APPWRITE_FUNCTION_ENDPOINT"])
      .setProject(req.variables["APPWRITE_FUNCTION_PROJECT_ID"])
      .setKey(req.variables["APPWRITE_FUNCTION_API_KEY"])
      .setSelfSigned(true);

    const database = new sdk.Databases(client);

    try {
      const { total, documents } = await database.listDocuments(
        databaseID,
        collectionID.reminders
      );

      const randomizedIndex = Math.floor(Math.random() * (total + 1));

      const options = {
        host: "leotj.zulipchat.com",
        port: 443,
        path: "/api/v1/messages",
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${req.variables["ZULIP_BOT_EMAIL_ADDRESS"]}:${req.variables["ZULIP_BOT_API_KEY"]}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };

      const data = querystring.stringify({
        type: "direct",
        to: req.variables["ZULIP_PERSONAL_EMAIL"],
        content: documents[randomizedIndex].message,
      });

      const request = https.request(options, (response) => {});
      request.on("error", (error) => {
        console.log("Sending Zulip Chat direct message failed.");
        console.log(error);
      });
      request.write(data);
      request.end();
    } catch (e) {
      console.log("error", e);
    }
  }

  res.json({
    success: true,
  });
};
