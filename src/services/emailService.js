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
        <head>
            <style>
                body{font-family:Arial, sans-serif; line-height:1.6; color:#333;}
                .container{max-width:600px; margin:0 auto; padding:20px;}
                .header{background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                 color:white padding:30px; text-align:center; border-radius: 10px 10px 0 0;}
                .content{background: #f9f9f9; padding:30px; border:30px border-radius; 0 0 10px 10px;}
                .otp-box{background: white; border:2px dashed #667eea; padding:20px; text-align:center; font-size:32px;
                 font-weight:bold; letter-spacing:5px; margin:20px 0; border-radius:10px;}
                .footer{text-align: center; margin-top:20px; font-size:12px; color:#666;}
                .warning{background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0;}
            </style>
        </head>
        <body>
        <div class="container">
            <div class="header">
                <h1>🛒 E-Commerce Platform</h1>
                <p>Email Verification</p>
            </div>
            <div class="content">
                <h2>Hello ${name || "User"}!</h2>
                <p>Thank you for signing up. Please use the following OTP to verify your email address:</p>
            </div>
            <div class="otp-box">${otp}</div>
            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
            <div class="warning">
                <strong>⚠️ Security Note:</strong> Never share this OTP with anyone. Our team will never ask for your OTP.
            </div>
             <p>If you didn't request this OTP, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2026 E-Commerce Platform. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
        </body>
      </html>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err) {
      console.error("Email send error: ", err);
      return { success: false, error: error.message };
    }
  }

  // Welcome Email
  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to Our E-commerce Platform!",
      html: `
        <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                        .feature { background: white; padding: 15px; border-radius: 5px; text-align: center; }
                    </style>
                </head>
                <body>
                <div class="container">
                <div class="header">
                    <h1>🎉 Welcome Aboard!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name}!</h2>
                    <p>Your email has been successfully verified. Welcome to our e-commerce platform!</p>
                <div class="features">
                    <div class="feature">
                        <h3>🚀 Fast Delivery</h3>
                        <p>Quick shipping</p>
                    </div>
                <div class="feature">
                    <h3>💰 Flash Sales</h3>
                    <p>Great deals</p>
                </div>
                    <div class="feature">
                        <h3>🔒 Secure</h3>
                        <p>Safe payments</p>
                    </div>
                <div class="feature">
                    <h3>📱 Track Orders</h3>
                    <p>Real-time updates</p>
                </div>
                </div>
                <center>
                  <a href="#" class="button">Start Shopping</a>
                </center>
                <p>Happy shopping!</p>
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
      console.error("Email send error: ", error);
      return { success: false, error: error.message };
    }
  }

  // order confirmation mail
  async sendOrderConfirmation(email, orderDetails) {
    const { orderNumber, items, totalAmount, shippingAddress } = orderDetails;

    const itemHtml = items
      .map((item) => {
        return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          ${item.name}
        </td>

        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
          ${item.quantity}
        </td>

        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
          $${item.price.toFixed(2)}
        </td>

        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
          $${item.total.toFixed(2)}
        </td>
      </tr>
    `;
      })
      .join("");

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Order Confirmation- ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .order-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
              th { background: #667eea; color: white; padding: 10px; text-align: left; }
              .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Order Confirmed!</h1>
                <p>Order #${orderNumber}</p>
              </div>
              <div class="content">
                <h2>Thank you for your order!</h2>
                <p>Your order has been confirmed and will be processed soon.</p>
                
                <div class="order-info">
                  <h3>Order Details:</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: right;">Price</th>
                        <th style="text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                  </table>
                  <div class="total">Total: $${totalAmount.toFixed(2)}</div>
                </div>
                
                <div class="order-info">
                  <h3>Shipping Address:</h3>
                  <p>
                    ${shippingAddress.street}<br>
                    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
                    ${shippingAddress.country}
                  </p>
                </div>
                
                <p>You'll receive another email when your order ships.</p>
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
      console.error("Email send error: ", err);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
