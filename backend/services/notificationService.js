import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export const NotificationService = {
    // Send payment reminder SMS
    async sendPaymentReminder(vehicleNumber, ownerName, contactNumber, amount, dueDate) {
        try {
            const message = await client.messages.create({
                body: `Dear ${ownerName}, your monthly par king rent of Rs.${amount} for vehicle ${vehicleNumber} is due on ${dueDate}. Please make the payment before the due date. - SP Car Parking`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contactNumber
            });
            console.log('Payment reminder sent:', message.sid);
            return true;
        } catch (error) {
            console.error('Error sending payment reminder:', error);
            return false;
        }
    },

    // Send WhatsApp Business API payment reminder
    async sendWhatsAppPaymentReminder(vehicleNumber, ownerName, contactNumber, amount) {
        try {
            const phoneId = process.env.WHATSAPP_PHONE_ID;
            const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
            const imageUrl = process.env.WHATSAPP_IMAGE_URL || 'https://via.placeholder.com/600x400.png?text=Payment+Reminder';

            if (!phoneId || !accessToken) {
                console.error("Missing WhatsApp configuration in .env");
                return false;
            }

            const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

            const payload = {
                messaging_product: "whatsapp",
                to: contactNumber,
                type: "template",
                template: {
                    name: "payment_reminder_sp", // Make sure this matches your approved template name
                    language: { code: "en" },
                    components: [
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "image",
                                    image: { link: imageUrl }
                                }
                            ]
                        },
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: ownerName },
                                { type: "text", text: amount.toString() },
                                { type: "text", text: vehicleNumber }
                            ]
                        }
                    ]
                }
            };

            // const payload = {
            //     messaging_product: "whatsapp",
            //     to: contactNumber,
            //     type: "template",
            //     template: {
            //         name: "hello_world",
            //         language: { code: "en_US" }
            //     }
            // };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                console.log('WhatsApp reminder sent successfully:', data);
                return true;
            } else {
                console.error('WhatsApp API Error:', data);
                return false;
            }
        } catch (error) {
            console.error('Error sending WhatsApp reminder:', error);
            return false;
        }
    }
};

export default NotificationService;