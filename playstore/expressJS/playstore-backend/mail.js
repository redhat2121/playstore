const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: "vamsidadi217@gmail.com",
    pass: "jsxwdvurgzuerbgc",
  },
});

async function sendCRUDNotification(
  recipients,
  action,
  itemName,
  itemType,
  additionalMessage = ""
) {
  let subject = "";
  let htmlContent = "";

  if (itemType === "user") {
    subject = `CRUD Operation: ${action.toUpperCase()} on User ${itemName}`;
  } else if (itemType === "app") {
    subject = `CRUD Operation: ${action.toUpperCase()} on ${itemName} App`;
  } else {
    console.error("Invalid item type");
    return;
  }

  try {
    const emailTemplate = fs.readFileSync("emailTemplate.ejs", "utf8");
    htmlContent = ejs.render(emailTemplate, {
      action,
      itemName,
      itemType,
      additionalMessage,
    });

    const info = await transporter.sendMail({
      from: '"Sai 👻" <vamsidadi217@gmail.com>',
      to: recipients.join(","),
      subject: subject,
      html: htmlContent,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { sendCRUDNotification };
