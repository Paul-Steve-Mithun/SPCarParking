import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors({
    origin: ['http://localhost:5174/', 'https://spcarparking.vercel.app'],
    credentials: true
}));
app.use(bodyParser.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB Connection Error:', err));

const VehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    vehicleDescription: { type: String },
    lotNumber: { type: String},
    ownerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    parkingType: { type: String, enum: ['private', 'open'], required: true },
    rentalType: { type: String, enum: ['monthly', 'daily'], required: true },
    rentPrice: { type: Number, required: true },
    numberOfDays: { type: Number, default: null },
    advanceAmount: { type: Number, default: 5000 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    additionalDays: {type: Number},
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

// Updated pre-save middleware to handle end dates correctly
VehicleSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('startDate') || this.isModified('numberOfDays')) {
        const startDate = new Date(this.startDate);
        
        if (this.rentalType === 'monthly') {
            // Get the last day of the current month
            const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            // Set time to end of day (23:59:59.999)
            lastDay.setHours(23, 59, 59, 999);
            this.endDate = lastDay;
        } else if (this.rentalType === 'daily' && this.numberOfDays) {
            // For daily rentals, set end date to midnight of the last day
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + this.numberOfDays - 1); // Subtract 1 because the start day counts as day 1
            endDate.setHours(23, 59, 59, 999);
            this.endDate = endDate;
        }
    }
    next();
});

const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// Function to update vehicle status
const updateVehicleStatus = async () => {
    const currentDate = new Date();
    await Vehicle.updateMany(
        { 
            endDate: { $lt: currentDate },
            status: 'active'
        },
        { 
            $set: { status: 'inactive' }
        }
    );
};

// Run status update every hour
setInterval(updateVehicleStatus, 1000 * 60 * 60);

// Add Vehicle
app.post('/addVehicle', async (req, res) => {
    try {
        const newVehicle = new Vehicle({
            ...req.body,
            status: 'active',
            startDate: new Date()
        });
        await newVehicle.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Vehicles
app.get('/vehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove Vehicle
app.delete('/removeVehicle/:id', async (req, res) => {
    try {
        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Updated reactivateVehicle endpoint to handle end dates correctly
app.put('/reactivateVehicle/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const currentDate = new Date();
        
        // Get the last day of the next month
        const lastDayNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        lastDayNextMonth.setHours(23, 59, 59, 999);
        
        // Calculate the number of days being added
        const daysDifference = Math.ceil((lastDayNextMonth - currentDate) / (1000 * 60 * 60 * 24));
        
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id, 
            { 
                status: status || 'active', 
                endDate: lastDayNextMonth,
                $inc: { additionalDays: daysDifference }
            }, 
            { new: true }
        );

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Vehicle
app.put('/updateVehicle/:id', async (req, res) => {
    try {
        // Remove startDate and endDate from the update data to preserve original dates
        const { startDate, endDate, ...updateData } = req.body;

        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ success: true, vehicle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Updated extendRental endpoint to handle end dates correctly
app.put('/extendRental/:id', async (req, res) => {
    try {
        const { additionalDays } = req.body;
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        if (vehicle.rentalType === 'daily') {
            const currentEndDate = new Date(vehicle.endDate);
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(currentEndDate.getDate() + Number(additionalDays));
            newEndDate.setHours(23, 59, 59, 999);
            vehicle.endDate = newEndDate;
            vehicle.numberOfDays += Number(additionalDays);
            vehicle.status = 'active';
        } else {
            // For monthly rentals, extend to the last day of the next month
            const currentEndDate = new Date(vehicle.endDate);
            const newEndDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth() + 1, 0);
            newEndDate.setHours(23, 59, 59, 999);
            vehicle.endDate = newEndDate;
            vehicle.status = 'active';
        }

        await vehicle.save();
        res.json({ success: true, vehicle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Vehicle Status Statistics
app.get('/vehicleStats', async (req, res) => {
    try {
        const stats = await Vehicle.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log('Server running on port 5000'));