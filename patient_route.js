const session = require("express-session");
var patient = require('./patientController');

module.exports = function (app) {
    app.get('/patient', function (req, res) {
        patient.home(req, res);
    });
    app.get('/patient/create-login/:email', function (req, res) {
        patient.setpatientsDetails(req, res);
    });
app.get('/patient/active-account/:email', function (req, res) {
        patient.activepatients(req, res);
    });

    app.post('/patient/patient-login', function (req, res) {
        patient.login(req, res, 'patient');
    });
    app.post('/patient/add-patient', function (req, res) {
        patient.registerPatient(req, res);
    });

    app.get('/patient/logout', function (req, res) {
        req.session.destroy(function (err) {
            res.redirect('/patient');
        })
    });
    
    app.post('/api/patient-details-update', function (req, res) {
        patient.updatePatientDetails(req, res, 'patient');
    });
    app.get('/api/patient/patient-details', function (req, res) {
        patient.getPatientDetails(req, res);
    });
    app.post('/api/patient/update-profile', function (req, res) {
        patient.profileUpdate(req, res);
    });
    

    /*Medication*/
    app.get('/api/patient/get-medication', function (req, res) {
        patient.getMedication(req, res);
    });
    app.get('/api/patient/single-medication/:id', function (req, res) {
        patient.getMedication(req, res);
    });

    app.post('/api/patient/add-medication', function (req, res) {
        patient.addMedicationByPatient(req, res);
    });
/*Prescription*/
    app.get('/api/patient/prescription-list', function (req, res) {
        patient.getPrescriptionslist(req, res);
    });

    app.get('/api/patient/single-prescription/:id', function (req, res) {
        patient.getPrescriptionsdetails(req, res);
    });

/*Appointment*/
    app.post('/api/patient/add-appointment', function (req, res) {
        patient.addAappointment(req, res);
    });

    app.get('/api/patient/get-appointment-list', function (req, res) {
        patient.patientGetAppointmentList(req, res);
    });

    app.get('/api/patient/get-appointment-details/:id', function (req, res) {
        patient.patientGetAppointmentDetails(req, res);
    });

    app.get('/api/patient/get-appointment-schedule/:id', function (req, res) {
        patient.getAappointmentSchedule(req, res);
    });
    app.get('/api/patient/get-providerlist', function (req, res) {
        patient.getProviderList(req, res);
    });
    /*app.get('/api/patient/single-prescription/:id', function (req, res) {
        patient.getPrescriptionsdetails(req, res);
    });*/
app.get('/api/patient/get-clinic/:id', function (req, res) {
        patient.clinicDetails(req, res);
    });

/*****FORM******/

    app.get('/api/patient/form-list', function (req, res) {
        patient.getForms(req, res);
    });
    app.get('/api/patient/form-details/:id', function (req, res) {
        patient.getFormDetals(req, res);
    });

    
    app.get('/patient/dashboard*', function (req, res) {
        patient.dashboard(req, res);
    });

};
