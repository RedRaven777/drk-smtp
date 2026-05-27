import "server-only";

import { NextResponse } from "next/server";
import {
	buildAttachments,
	getMailerByKey,
	sendMail,
} from "@/lib/mail/mail.service";
import { getContactsAdminHtml } from "@/lib/forms/templates/contacts/admin.html";
import { getContactsUserHtml } from "@/lib/forms/templates/contacts/user.html";

export async function handleContactForm(req: Request) {
	try {
		const formData = await req.formData();

		const name = String(formData.get("name") ?? "");
		const email = String(formData.get("email") ?? "");
		const phone = String(formData.get("phone") ?? "");
		const title = String(formData.get("title") ?? "");
		const message = String(formData.get("message") ?? "");

		const docs = formData.getAll("doc") as File[];
		const attachments = await buildAttachments(docs);

		const mailer = await getMailerByKey("CONTACTS");

		if (!mailer.recipient) {
			throw new Error("Recipient not configured");
		}

		await sendMail({
			smtpKey: "CONTACTS",
			fromName: "Webseite Kontakt",
			to: mailer.recipient,
			subject: "Kontaktanfrage",
			html: getContactsAdminHtml({
				name,
				email,
				phone,
				title,
				message,
			}),
			attachments,
		});

		await sendMail({
			smtpKey: "CONTACTS",
			fromName: "Ihre Praxis",
			to: email,
			subject: "Vielen Dank für Ihre Nachricht",
			html: getContactsUserHtml(),
		});

		return NextResponse.json({ message: "Form successfully sent" });
	} catch (error) {
		console.error("CONTACT FORM ERROR:", error);

		return NextResponse.json(
			{ message: "Error sending form" },
			{ status: 500 }
		);
	}
}