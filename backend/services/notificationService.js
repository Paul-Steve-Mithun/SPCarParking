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
                body: `Dear ${ownerName}, your monthly parking rent of Rs.${amount} for vehicle ${vehicleNumber} is due on ${dueDate}. Please make the payment before the due date. - SP Car Parking`,
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
};

export default NotificationService; 