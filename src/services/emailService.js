const transporter = require("../configs/email");

class EmailService {
  // OTP EMAIL
  async sendOTPEmail(email, otp, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your OTP for Email Verification",

      html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif;">

          <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e5;">

            <!-- Header -->
            <div style="background:#667eea; color:#ffffff; padding:35px 25px; text-align:center;">

              <h1 style="margin:0; font-size:28px;">
                🛒 e-Shopping Platform
              </h1>

              <p style="margin-top:10px; font-size:16px;">
                Email Verification
              </p>

            </div>

            <!-- Content -->
            <div style="padding:35px 30px;">

              <h2 style="margin-top:0; color:#333;">
                Hello ${name || "User"}!
              </h2>

              <p style="color:#555; line-height:1.7;">
                Thank you for signing up. Please use the following OTP
                to verify your email address:
              </p>

              <!-- OTP BOX -->
              <div style="
                background:#ffffff;
                border:2px dashed #667eea;
                padding:20px;
                text-align:center;
                font-size:34px;
                font-weight:bold;
                letter-spacing:6px;
                margin:30px 0;
                border-radius:10px;
                color:#333;
              ">
                ${otp}
              </div>

              <p style="color:#555;">
                This OTP is valid for
                <strong>10 minutes</strong>.
              </p>

              <!-- Warning -->
              <div style="
                background:#fff3cd;
                border-left:4px solid #ffc107;
                padding:15px;
                margin:25px 0;
                border-radius:6px;
                color:#664d03;
              ">

                <strong>⚠️ Security Note:</strong><br>

                Never share this OTP with anyone.
                Our team will never ask for your OTP.

              </div>

              <p style="color:#666; line-height:1.6;">
                If you didn't request this OTP,
                please ignore this email.
              </p>

            </div>

            <!-- Footer -->
            <div style="
              text-align:center;
              padding:20px;
              font-size:12px;
              color:#888;
              background:#fafafa;
              border-top:1px solid #eeeeee;
            ">

              <p style="margin:0 0 8px 0;">
                © 2026 e-Shopping Platform.
                All rights reserved.
              </p>

              <p style="margin:0;">
                This is an automated email.
                Please do not reply.
              </p>

            </div>

          </div>

        </body>
      </html>
    `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      console.error("Email send error:", err);
      return { success: false, error: err.message };
    }
  }

  // Welcome Email
  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to Our e-Shopping Platform!",

      html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif;">

          <div style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            border:1px solid #e5e5e5;
          ">

            <!-- Header -->
            <div style="
              background:#667eea;
              color:#ffffff;
              padding:40px 30px;
              text-align:center;
            ">

              <h1 style="margin:0; font-size:30px;">
                🎉 Welcome Aboard!
              </h1>

            </div>

            <!-- Content -->
            <div style="padding:35px 30px;">

              <h2 style="margin-top:0; color:#333;">
                Hi ${name || "User"}!
              </h2>

              <p style="color:#555; line-height:1.7;">
                Your email has been successfully verified.
                Welcome to our e-shopping platform!
              </p>

              <!-- Features -->
              <table
                width="100%"
                cellpadding="10"
                cellspacing="0"
                style="margin:30px 0;"
              >

                <tr>

                  <td
                    width="50%"
                    style="
                      background:#f9f9f9;
                      border-radius:8px;
                      text-align:center;
                    "
                  >

                    <h3 style="margin:10px 0 5px 0;">
                      🚀 Fast Delivery
                    </h3>

                    <p style="margin:0; color:#666;">
                      Quick shipping
                    </p>

                  </td>

                  <td width="20"></td>

                  <td
                    width="50%"
                    style="
                      background:#f9f9f9;
                      border-radius:8px;
                      text-align:center;
                    "
                  >

                    <h3 style="margin:10px 0 5px 0;">
                      💰 Flash Sales
                    </h3>

                    <p style="margin:0; color:#666;">
                      Great deals
                    </p>

                  </td>

                </tr>

                <tr><td height="15"></td></tr>

                <tr>

                  <td
                    width="50%"
                    style="
                      background:#f9f9f9;
                      border-radius:8px;
                      text-align:center;
                    "
                  >

                    <h3 style="margin:10px 0 5px 0;">
                      🔒 Secure Payments
                    </h3>

                    <p style="margin:0; color:#666;">
                      Safe checkout
                    </p>

                  </td>

                  <td width="20"></td>

                  <td
                    width="50%"
                    style="
                      background:#f9f9f9;
                      border-radius:8px;
                      text-align:center;
                    "
                  >

                    <h3 style="margin:10px 0 5px 0;">
                      📦 Track Orders
                    </h3>

                    <p style="margin:0; color:#666;">
                      Real-time updates
                    </p>

                  </td>

                </tr>

              </table>

              <!-- Button -->
              <div style="text-align:center; margin:35px 0;">

                <a
                  href="https://yourstore.com"
                  style="
                    display:inline-block;
                    background:#667eea;
                    color:#ffffff;
                    text-decoration:none;
                    padding:14px 32px;
                    border-radius:6px;
                    font-weight:bold;
                    font-size:16px;
                  "
                >
                  Start Shopping
                </a>

              </div>

              <p style="color:#666; line-height:1.6;">
                Happy shopping! 🛍️
              </p>

            </div>

            <!-- Footer -->
            <div style="
              background:#fafafa;
              padding:20px;
              text-align:center;
              font-size:12px;
              color:#888;
              border-top:1px solid #eeeeee;
            ">

              <p style="margin:0 0 8px 0;">
                © 2026 e-Shopping Platform.
                All rights reserved.
              </p>

              <p style="margin:0;">
                This is an automated email.
                Please do not reply.
              </p>

            </div>

          </div>

        </body>
      </html>
    `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      console.error("Email send error:", err);
      return { success: false, error: err.message };
    }
  }

  // order confirmation mail
  async sendOrderConfirmation(email, orderDetails) {
    const { orderNumber, items, totalAmount, shippingAddress } = orderDetails;

    const itemHtml = items
      .map((item) => {
        return `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e5e5e5;">
            ${item.name}
          </td>

          <td style="padding:12px; border-bottom:1px solid #e5e5e5; text-align:center;">
            ${item.quantity}
          </td>

          <td style="padding:12px; border-bottom:1px solid #e5e5e5; text-align:right;">
            $${item.price.toFixed(2)}
          </td>

          <td style="padding:12px; border-bottom:1px solid #e5e5e5; text-align:right; font-weight:600;">
            $${item.total.toFixed(2)}
          </td>
        </tr>
      `;
      })
      .join("");

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,

      html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif;">

          <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e5;">

            <!-- Header -->
            <div style="background:#28a745; padding:30px; text-align:center; color:#ffffff;">
              <h1 style="margin:0; font-size:28px;">
                ✅ Order Confirmed!
              </h1>

              <p style="margin-top:10px; font-size:16px;">
                Order #${orderNumber}
              </p>
            </div>

            <!-- Content -->
            <div style="padding:30px;">

              <h2 style="margin-top:0; color:#333;">
                Thank you for your order!
              </h2>

              <p style="color:#666; line-height:1.6;">
                Your order has been confirmed and will be processed soon.
              </p>

              <!-- Order Details -->
              <div style="margin-top:30px;">
                <h3 style="margin-bottom:15px; color:#333;">
                  Order Details
                </h3>

                <table style="width:100%; border-collapse:collapse;">

                  <thead>
                    <tr style="background:#667eea; color:#ffffff;">
                      <th style="padding:12px; text-align:left;">
                        Product
                      </th>

                      <th style="padding:12px; text-align:center;">
                        Qty
                      </th>

                      <th style="padding:12px; text-align:right;">
                        Price
                      </th>

                      <th style="padding:12px; text-align:right;">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itemHtml}
                  </tbody>
                </table>

                <div style="margin-top:20px; text-align:right; font-size:20px; font-weight:bold; color:#222;">
                  Total: $${totalAmount.toFixed(2)}
                </div>
              </div>

              <!-- Shipping -->
              <div style="margin-top:35px; padding:20px; background:#f9f9f9; border-radius:8px;">

                <h3 style="margin-top:0; color:#333;">
                  Shipping Address
                </h3>

                <p style="margin:0; color:#555; line-height:1.7;">
                  ${shippingAddress.street}<br>
                  ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
                  ${shippingAddress.country}
                </p>
              </div>

              <p style="margin-top:30px; color:#666;">
                You'll receive another email when your order ships.
              </p>

            </div>
          </div>

        </body>
      </html>
    `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      console.error("Email send error:", err);
      return { success: false, error: err.message };
    }
  }

  // Password reset email
  async sendPasswordResetEmail(email, code, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your password",

      html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e5;">

            <div style="background:#7c3aed; color:#ffffff; padding:35px 25px; text-align:center;">
              <h1 style="margin:0; font-size:28px;">🔑 Password Reset</h1>
              <p style="margin-top:10px; font-size:16px;">Use the code below to reset your password</p>
            </div>

            <div style="padding:35px 30px;">
              <h2 style="margin-top:0; color:#333;">Hi ${name || "there"},</h2>
              <p style="color:#555; line-height:1.7;">
                We received a request to reset the password for your account.
                Enter this code in the password reset page to continue:
              </p>

              <div style="
                background:#ffffff;
                border:2px dashed #7c3aed;
                padding:20px;
                text-align:center;
                font-size:34px;
                font-weight:bold;
                letter-spacing:6px;
                margin:30px 0;
                border-radius:10px;
                color:#333;
              ">
                ${code}
              </div>

              <p style="color:#555;">
                This code is valid for <strong>10 minutes</strong>.
              </p>

              <div style="
                background:#fef2f2;
                border-left:4px solid #ef4444;
                padding:15px;
                margin:25px 0;
                border-radius:6px;
                color:#7f1d1d;
              ">
                <strong>⚠️ Didn't request this?</strong><br>
                If you didn't ask to reset your password, you can safely ignore
                this email — your password will stay the same.
              </div>
            </div>

            <div style="
              text-align:center;
              padding:20px;
              font-size:12px;
              color:#888;
              background:#fafafa;
              border-top:1px solid #eeeeee;
            ">
              <p style="margin:0 0 8px 0;">© 2026 e-Shopping Platform. All rights reserved.</p>
              <p style="margin:0;">This is an automated email. Please do not reply.</p>
            </div>

          </div>
        </body>
      </html>
    `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      console.error("Email send error:", err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
