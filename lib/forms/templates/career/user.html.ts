export function getCareerUserHtml() {
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
              <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden;">
                <tr>
                  <td align="center" style="padding: 40px 30px 0;">
                    <h1 class="fallback-font" style="margin:0 0 20px; font-size:24px; font-weight: 600; line-height:140%; color:#111111;">
                      Sehr geehrte/r Bewerber/inessierte
                    </h1> 
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 5px 30px; margin: 0;">
                    <p class="fallback-font" style="margin: 0;">vielen Dank für Ihre Bewerbung und Ihr Interesse an einer Mitarbeit in unserer Hausarztpraxis</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 5px 30px; margin: 0;">
                    <p class="fallback-font" style="margin: 0;">Wir haben Ihre Unterlagen erhalten und melden uns zeitnah bei Ihnen</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 5px 30px 40px; margin: 0;">
                    <p class="fallback-font" style="margin: 0;">Praxisteam</p>
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