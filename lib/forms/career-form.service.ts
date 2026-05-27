import "server-only";

import { NextResponse } from "next/server";
import {
	buildAttachments,
	getMailerByKey,
	sendMail,
} from "@/lib/mail/mail.service";
import { getCareerAdminHtml } from "@/lib/forms/templates/career/admin.html";
import { getCareerUserHtml } from "@/lib/forms/templates/career/user.html";

export async function handleCareerForm(req: Request) {
	try {
		const formData = await req.formData();

		const name = String(formData.get("name") ?? "");
		const email = String(formData.get("email") ?? "");
		const phone = String(formData.get("phone") ?? "");
		const vacancy = String(formData.get("vacancy") ?? "");
		const message = String(formData.get("message") ?? "");

		const cvs = formData.getAll("cv") as File[];
		const attachments = await buildAttachments(cvs);

		const mailer = await getMailerByKey("CAREER");

		if (!mailer.recipient) {
			throw new Error("Recipient not configured");
		}

		await sendMail({
			smtpKey: "CAREER",
			fromName: "Webseite Karriere",
			to: mailer.recipient,
			subject: `Bewerbung: ${vacancy}`,
			html: getCareerAdminHtml({
				name,
				email,
				phone,
				vacancy,
				message,
			}),
			attachments,
		});

		await sendMail({
			smtpKey: "CAREER",
			fromName: "Ihre Praxis",
			to: email,
			subject: "Bestätigung Ihres Bewerbungseingangs",
			html: getCareerUserHtml(),
		});

		return NextResponse.json({ message: "Form successfully sent" });
	} catch (error) {
		console.error("CAREER FORM ERROR:", error);

		return NextResponse.json(
			{ message: "Error sending form" },
			{ status: 500 }
		);
	}
}