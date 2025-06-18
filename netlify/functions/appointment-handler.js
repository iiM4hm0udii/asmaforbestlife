const fs = require('fs').promises;
const path = require('path');

const databasePath = path.join(__dirname, '..', '..', '..', 'database', 'appointments.json');

// Helper function to validate appointment data
function validateAppointmentData(data) {
    const requiredFields = ['name', 'phone', 'email', 'date', 'time', 'reason'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
    }

    // Validate phone number format
    const phoneRegex = /^[0-9\-\+]{10,}$/;
    if (!phoneRegex.test(data.phone)) {
        throw new Error('Invalid phone number format');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD');
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(data.time)) {
        throw new Error('Invalid time format. Please use HH:MM');
    }
}

exports.handler = async (event) => {
    try {
        const { httpMethod, body, queryStringParameters } = event;
        
        // Validate request method
        if (!['POST', 'GET', 'PUT', 'DELETE'].includes(httpMethod)) {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: 'Method not allowed' })
            };
        }

        // Read database
        let appointments;
        try {
            const data = await fs.readFile(databasePath, 'utf8');
            appointments = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist, create empty database
            if (error.code === 'ENOENT') {
                appointments = { appointments: [] };
            } else {
                throw error;
            }
        }

        // Handle different HTTP methods
        switch (httpMethod) {
            case 'POST':
                return await handleCreateAppointment(body, appointments);
            case 'GET':
                return await handleGetAppointments(queryStringParameters, appointments);
            case 'PUT':
                return await handleUpdateAppointment(body, appointments);
            case 'DELETE':
                return await handleCancelAppointment(queryStringParameters, appointments);
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                message: error.message || 'Internal server error',
                error: error.message
            })
        };
    }
};

async function handleCreateAppointment(body, appointments) {
    try {
        const data = JSON.parse(body);
        validateAppointmentData(data);

        // Generate new ID
        const newId = (appointments.appointments.length + 1).toString();

        // Create new appointment
        const newAppointment = {
            id: newId,
            ...data,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            notes: '',
            cancelled_at: null,
            cancelled_by: null,
            cancelled_reason: null
        };

        // Add to appointments
        appointments.appointments.push(newAppointment);
        await fs.writeFile(databasePath, JSON.stringify(appointments, null, 2));

        // Send confirmation email
        try {
            await sendConfirmationEmail(newAppointment);
        } catch (error) {
            console.error('Failed to send confirmation email:', error);
        }

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                message: 'Appointment created successfully', 
                appointment: newAppointment 
            })
        };
    } catch (error) {
        throw error;
    }
}

async function handleGetAppointments(params, appointments) {
    try {
        let filteredAppointments = [...appointments.appointments];

        // Filter by status if provided
        if (params && params.status) {
            filteredAppointments = filteredAppointments.filter(
                a => a.status.toLowerCase() === params.status.toLowerCase()
            );
        }

        // Filter by date if provided
        if (params && params.date) {
            filteredAppointments = filteredAppointments.filter(
                a => a.date === params.date
            );
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ appointments: filteredAppointments })
        };
    } catch (error) {
        throw error;
    }
}

async function handleUpdateAppointment(body, appointments) {
    try {
        const data = JSON.parse(body);
        const { id, status, notes } = data;
        
        if (!id) {
            throw new Error('Appointment ID is required');
        }

        const appointmentIndex = appointments.appointments.findIndex(a => a.id === id);
        if (appointmentIndex === -1) {
            throw new Error('Appointment not found');
        }

        const appointment = appointments.appointments[appointmentIndex];
        
        if (status) {
            appointment.status = status;
        }
        if (notes) {
            appointment.notes = notes;
        }
        appointment.updated_at = new Date().toISOString();

        appointments.appointments[appointmentIndex] = appointment;
        await fs.writeFile(databasePath, JSON.stringify(appointments, null, 2));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                message: 'Appointment updated successfully', 
                appointment 
            })
        };
    } catch (error) {
        throw error;
    }
}

async function handleCancelAppointment(params, appointments) {
    try {
        const { id, reason } = params;
        
        if (!id) {
            throw new Error('Appointment ID is required');
        }

        const appointmentIndex = appointments.appointments.findIndex(a => a.id === id);
        if (appointmentIndex === -1) {
            throw new Error('Appointment not found');
        }

        const appointment = appointments.appointments[appointmentIndex];
        appointment.status = 'cancelled';
        appointment.cancelled_at = new Date().toISOString();
        appointment.cancelled_reason = reason || 'Patient cancelled';
        appointment.updated_at = new Date().toISOString();

        appointments.appointments[appointmentIndex] = appointment;
        await fs.writeFile(databasePath, JSON.stringify(appointments, null, 2));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                message: 'Appointment cancelled successfully', 
                appointment 
            })
        };
    } catch (error) {
        throw error;
    }
}

async function sendConfirmationEmail(appointment) {
    try {
        // Here you would typically use Netlify's email service or another email provider
        // For now, we'll just log the email data
        console.log('Sending confirmation email:', {
            to: appointment.email,
            subject: 'Your Appointment Confirmation',
            template: 'appointment-confirmation',
            variables: {
                name: appointment.name,
                date: appointment.date,
                time: appointment.time,
                reason: appointment.reason
            }
        });
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
    }
}
