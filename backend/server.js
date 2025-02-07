import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
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

VehicleSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('startDate') || this.isModified('numberOfDays')) {
        if (this.rentalType === 'daily' && this.numberOfDays) {
            this.endDate = new Date(this.startDate);
            this.endDate.setDate(this.endDate.getDate() + this.numberOfDays);
        } else if (this.rentalType === 'monthly') {
            this.endDate = new Date(this.startDate);
            this.endDate.setMonth(this.endDate.getMonth() + 1);
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
setInterval(updateVehicleStatus,1000 * 60 * 60);

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

// Reactivate Vehicle
app.put('/reactivateVehicle/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const currentDate = new Date();
        
        // Calculate the number of days being added (for the actual number of days in the next month)
        const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        const daysDifference = Math.ceil((nextMonth - new Date()) / (1000 * 60 * 60 * 24));
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id, 
            { 
                status: status || 'active', 
                endDate: nextMonth,
                $inc: { additionalDays: daysDifference }  // Increment by actual number of days in the month
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

// Extend Vehicle Rental
app.put('/extendRental/:id', async (req, res) => {
    try {
        const { additionalDays } = req.body;
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        if (vehicle.rentalType === 'daily') {
            const newEndDate = new Date(vehicle.endDate);
            newEndDate.setDate(newEndDate.getDate() + Number(additionalDays));
            vehicle.endDate = newEndDate;
            vehicle.numberOfDays += Number(additionalDays);
            vehicle.status = 'active';
        } else {
            const newEndDate = new Date(vehicle.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + 1);
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