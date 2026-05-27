import "server-only";

import { NextResponse } from "next/server";
import { getMailerByKey, sendMail } from "@/lib/mail/mail.service";
import { getNewRecipeAdminHtml } from "@/lib/forms/templates/newrecipe/admin.html";
import { getNewRecipeUserHtml } from "@/lib/forms/templates/newrecipe/user.html";

export async function handleNewRecipeForm(req: Request) {
	try {
		const {
			name,
			birthdate,
			email,
			phone,
			clinic,
			question,
		} = await req.json();

		if (!name || !birthdate || !phone || !email || !clinic) {
			return NextResponse.json(
				{ message: "Missing required fields" },
				{ status: 400 }
			);
		}

		const mailer = await getMailerByKey("NEWRECIPE");

		if (!mailer.recipient) {
			throw new Error("Recipient not configured");
		}

		await sendMail({
			smtpKey: "NEWRECIPE",
			fromName: "Webseite Rezept-/Überweisungsformular",
			to: mailer.recipient,
			subject: `Rezept-/Überweisungsanfrage: ${clinic}`,
			html: getNewRecipeAdminHtml({
				name,
				birthdate,
				email,
				phone,
				clinic,
				question,
			}),
		});

		await sendMail({
			smtpKey: "NEWRECIPE",
			fromName: "Ihre Praxis",
			to: email,
			subject: "Vielen Dank für Ihre Nachricht",
			html: getNewRecipeUserHtml(),
		});

		return NextResponse.json({ message: "Form successfully sent" });
	} catch (error) {
		console.error("NEWRECIPE FORM ERROR:", error);

		return NextResponse.json(
			{ message: "Error sending form" },
			{ status: 500 }
		);
	}
}