type Params = {
  name: string;
  email: string;
  phone: string;
  title: string;
  message: string;
};

export function getContactsAdminHtml({
  name,
  email,
  phone,
  title,
  message,
}: Params) {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Example Email</title>
      <style>
        body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
        img{ -ms-interpolation-mode:bicubic; }
        img{ border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
        table{ border-collapse:collapse !important; }
        body{ margin:0 !important; padding:0 !important; width:100% !important; }
        @media screen and (max-width:600px){
          .container { width:100% !important; padding: 10px !important; }
          .stack { display:block !important; width:100% !important; max-width:100% !important; }
          .hero { font-size:20px !important; }
          .button { padding:12px 18px !important; font-size:16px !important; }
        }
        .fallback-font { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      </style>
    </head>
    <body style="background-color:#f4f4f7; margin:0; padding:0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:30px 10px;">
            <table class="container" width="600"
              cellpadding="0" cellspacing="0"
              style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden;">
              <tr>
                <td align="left" style="padding:40px 30px 15px 30px;;">
                  <h1 class="fallback-font" style="margin:0; font-size:24px; font-weight: 600; line-height:100%; color:#111111;">
                    Kontaktanfrage
                  </h1>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:15px 30px;">
                  <h3 class="fallback-font" style="margin:0; font-size:16px; color:#111111;">
                    <p style="font-weight:500; margin:0 0 10px; color:#55565b;">Vor- und Nachname:</p>
                    <p style="font-weight:600; margin:0;">${name}</p>
                  </h3>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:15px 30px;">
                  <h3 class="fallback-font" style="margin:0; font-size:16px; color:#111111;">
                    <p style="font-weight:500; margin:0 0 10px; color:#55565b;">Telefonnummer:</p>
                    <p style="font-weight:600; margin:0;">${phone}</p>
                  </h3>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:15px 30px;">
                  <h3 class="fallback-font" style="margin:0; font-size:16px; color:#111111;">
                    <p style="font-weight:500; margin:0 0 10px; color:#55565b;">E-Mail:</p>
                    <p style="font-weight:600; margin:0;"><a href="mailto:${email}">${email}</a></p>
                    <a 
                      href="mailto:${email}"
                      style="
                        background: #0084d1;
                        color: #ffffff;
                        font-weight: 500;
                        font-size: 16px;
                        width: fit-content;
                        border-radius: 40px;
                        padding: 15px 20px;
                        margin-top: 10px;
                        line-height: 100%;
                        text-decoration: none;
                        display: block;
                      "
                    >
                      Direktantwort
                    </a>

                  </h3>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:15px 30px;">
                  <h3 class="fallback-font" style="margin:0; font-size:16px; color:#111111;">
                    <p style="font-weight:500; margin:0 0 10px; color:#55565b;">Betreff:</p>
                    <p style="font-weight:600; margin:0;">${title}</p>
                  </h3>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:15px 30px 40px;">
                  <h3 class="fallback-font" style="margin:0; font-size:16px; color:#111111;">
                    <p style="font-weight:500; margin:0 0 10px; color:#55565b;">Nachricht:</p>
                    <p style="font-weight:600; margin:0;">${message}</p>
                  </h3>
                </td>
              </tr>
              <tr>
                <td align="center" style="background-color:#f9fafb; padding:16px 24px; border-top:1px solid #ececec;">
                  <p class="fallback-font" style="margin:0; font-size:13px; color:#9ca3af;">
                    DR. KLOOS, DR. TILLMAN & KOLLEGEN
                  </p>
                  <p class="fallback-font" style="margin:0; font-size:13px; color:#9ca3af;">
                    Leppestr. 14, 51709 Marienheide / Schwarzenbergerstr. 38, 51647 Hülsenbusch
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}