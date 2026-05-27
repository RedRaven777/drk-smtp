import "server-only";

import { NextResponse } from "next/server";
import { getMailerByKey, sendMail } from "@/lib/mail/mail.service";
import { getContactPopupAdminHtml } from "@/lib/forms/templates/contact-popup/admin.html";
import { getContactPopupUserHtml } from "@/lib/forms/templates/contact-popup/user.html";

export async function handleContactPopupForm(req: Request) {
	try {
		const {
			name,
			birthdate,
			email,
			phone,
			question,
			clinic,
		} = await req.json();

		if (!name || !birthdate || !email || !phone || !clinic) {
			return NextResponse.json(
				{ question: "Missing required fields" },
				{ status: 400 }
			);
		}

		const mailer = await getMailerByKey("CONTACTS_POPUP");

		if (!mailer.recipient) {
			throw new Error("Recipient not configured");
		}

		await sendMail({
			smtpKey: "CONTACTS_POPUP",
			fromName: "Webseite Terminanfrage",
			to: mailer.recipient,
			subject: `Terminanfrage: ${clinic}`,
			html: getContactPopupAdminHtml({
				name,
				birthdate,
				email,
				phone,
				question,
				clinic,
			}),
		});

		await sendMail({
			smtpKey: "CONTACTS_POPUP",
			fromName: "Ihre Praxis",
			to: email,
			subject: "Vielen Dank für Ihre Nachricht",
			html: getContactPopupUserHtml(),
		});

		return NextResponse.json({ question: "Form successfully sent" });
	} catch (error) {
		console.error("CONTACT POPUP FORM ERROR:", error);

		return NextResponse.json(
			{ question: "Error sending form" },
			{ status: 500 }
		);
	}
}