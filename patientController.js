const express = require('express');
var app = express();
const session = require("express-session");
const sql = require('mysql');
const url = require('url');
const bodyParser = require('body-parser');
const multer = require('multer');
var path = require("path");
var nodemailer = require('nodemailer');
var fs = require('fs');
var configUrl = require('../../config');
var paypal = require('paypal-rest-sdk');
var async = require('async');
var emailfunction = require('../../email/controller/emailController');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// config for your database
var config = {
    user: 'medteam_user',
    password: 'zZ9=cg#_j%?G',
    server: 'localhost',
    database: 'medteam_db'
};

// connect to your database
var connect = sql.createConnection(config, function (err) {
    if (err) console.log(err);
});

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = {
    home: function (req, res) {
        var call = `call admin_getAllCountry('1','')`;

        connect.query(call, true, function (error, results, fields) {
            //callback(null, results);
            res.render('frontend/patient_ejs/home', {
                country: results[0],
            });
        });
    },

    login: function (req, res) {
        var call = `call patient_UserAuthentication('` + req.body.user + `','` + req.body.pass + `', @userID,@errorMessage,@userName);`;
        connect.query(call, true, function (error, results, fields) {
            if (error) {
                //res.send('error');
                res.send(error);
            } else {
                req.session.patientID = results[0][0].userID;
                req.session.patientFname = results[0][0].userName;
                res.send(results[0]);
            }
        });
    },

    setpatientsDetails: function (req, res) {
        if (req.params.email) {
            let email = req.params.email;
            let buff = new Buffer(email, 'base64');
            let decodedEmail = buff.toString('ascii');
            //res.send(text);

            var call = `call common_getDataFromEmail('patient','` + decodedEmail + `', @errorMessage, @successMessage)`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(error);
                } else {
                    console.log(results[0]);
                    //
                    if (results[0][0]['user_name'] !== '') {
                        res.redirect('/patient');
                    } else {
                        //res.send('UserName'+results[0][0]['user_name']);
                        res.render('frontend/patient_ejs/user-verification', {
                            patientId: results[0][0]['id'],
                            Email: decodedEmail
                        });
                    }
                }
            });
        } else {
            res.send('Error');

        }
    },


    activepatients: function (req, res) {
        if (req.params.email) {
            let email = req.params.email;
            let buff = new Buffer(email, 'base64');
            let decodedEmail = buff.toString('ascii');
            //res.send(text);
            var call = `call patient_activebyEmail('` + decodedEmail + `','1', @patientEmail, @errorMessage)`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send('Error');
                } else {

                    res.redirect('/patient');
                    //res.send('Sucess');
                }
            });
        } else {
            res.send('Error');
        }
    },



    updatePatientDetails: function (req, res) {
        var call = `call patient_update('` + req.body.Email + `','` + req.body.user_name + `','` + req.body.password + `','1', @patientEmail, @errorMessage)`;
        connect.query(call, true, function (error, results, fields) {
            if (error) {
                res.send('Error');
            } else {
                res.send('Sucess');
            }
        });
    },

    //++++++++++++++++++++++++++ ADD PATIENT+++++++++++++++++++++++++++++++++++++++++++++//

    registerPatient: function (req, res) {
        //res.send(req.body);

        console.log(uuidv4());
        //----------------Encrypted folder creation-----------------------//
        var folderName = uuidv4();
        var dir = './public/uploads/patients/' + folderName;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        //----------------------------------------------------------------//
        var storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, dir)
            },
            filename: function (req, file, cb) {
                var datetimestamp = Date.now();
                cb(null, "patient_" + file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
            }
        });

        //res.send(req.body)
        var upload = multer({
            storage: storage,
            fileFilter: function (req, file, callback) {
                var ext = path.extname(file.originalname);
                if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                    res.send({
                        message: "Only jpg, png, gif, jpeg are allowed."
                    });
                    return callback(null, false);
                }
                callback(null, true);
            },
        }).any();

        upload(req, res, function (err) {

            var fileName;
            var userId;
            if (req.files) {
                if (req.files.length < 1) {
                    fileName = "";
                } else {
                    fileName = req.files[0].filename;
                }
            } else {
                fileName = "";
            }

            if (req.body.id == 0) {
                userId = "";
            } else {
                userId = req.body.id;
            }

            if (err) {
                //----------------Encrypted folder Delete if err-----------------------//
                if (fs.existsSync(dir)) {
                    if (fileName != '') {
                        var curPath = dir + "/" + fileName;
                        fs.unlinkSync(curPath);
                        fs.rmdirSync(dir);
                    } else {
                        fs.rmdirSync(dir);
                    }
                }
                //--------------------------------------------------------------------//
                res.json({
                    error_code: 1,
                    err_desc: err
                });
                return;
            } else {
                console.log(req.body);
                var sluck = req.body.first_name + '-' + req.body.last_name;
                var call2 = `call get_countpatientslack('` + sluck + `')`;
                connect.query(call2, true, function (error2, results2, fields) {

                    if (error2) {
                        res.send("error");

                    } else {
                        var slackcount = results2[0][0].noslack;
                        if (slackcount == 0) {
                            sluck = sluck;
                        } else {
                            slackcount = parseInt(slackcount + 1);
                            sluck = sluck + '' + slackcount;
                        }

                        var call = `call admin_setPatient('` + req.body.first_name + `', '` + req.body.last_name + `', '` + req.body.email + `', '` + req.body.user_name + `','` + sluck + `', '` + req.body.phone_prefix + `', '` + req.body.phone + `', '` + req.body.password + `', '` + req.body.gender + `', '` + req.body.dob + `', '` + req.body.address + `', '` + fileName + `', '` + req.body.country + `', '` + req.body.city + `', '` + req.body.zipcode + `', '` + folderName + `','', 'patient', '', '0', '` + userId + `', @providerID, @errorMessage)`;
                        console.log(call);

                        connect.query(call, true, function (error, results, fields) {
                            if (error) {
                                //----------------Encrypted folder Delete if err-----------------------//
                                if (fs.existsSync(dir)) {
                                    if (fileName != '') {
                                        var curPath = dir + "/" + fileName;
                                        fs.unlinkSync(curPath);
                                        fs.rmdirSync(dir);
                                    } else {
                                        fs.rmdirSync(dir);
                                    }
                                }
                                //--------------------------------------------------------------------//
                                res.send("error");
                                return console.error(error.message);
                            } else {
                                var email = req.body.email;
                                let buff = new Buffer(email);
                                let base64Email = buff.toString('base64');
                                var staticemail = 'aquatechdev2@gmail.com';
                                var baseurl = configUrl.baseUrl;
                                var passwordurl = baseurl + 'patient/active-account/' + base64Email;

                                emailfunction.patientactiveEmail(req.body, passwordurl);
                                //emailfunction.registerPatientEmail(req.body);
                                res.send({
                                    status: "success"
                                });
                            }
                        });
                    }
                });
            }
        });
    },

    //===================================================================================//

    getPatientDetails: function (req, res) {
        console.log("req.session.patientID");
        console.log(req.session.patientID);
        if (req.session.patientID == undefined || req.session.patientID == "") {
            res.send("error");
        } else {
            var call = `call admin_getAllPatient('','` + req.session.patientID + `')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(error);
                } else {
                    //console.log(results[0]);
                    res.send(results[0]);
                }
            });
        }
    },

    //++++++++++++++++++++++++++ Update PATIENT Profile +++++++++++++++++++++++++++++++++++++++++++++//

    profileUpdate: function (req, res) {
        //var dir = './public/uploads/patients/1228e67c-0b28-42fc-ac52-89ed1e89ab3b';
        //console.log('Body-');

        var storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, './public/uploads/patients/' + req.body.folder_id)
            },
            filename: function (req, file, cb) {
                var datetimestamp = Date.now();
                cb(null, "patient_" + file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
            }
        });

        //res.send(req.body)
        var upload = multer({
            storage: storage,
            fileFilter: function (req, file, callback) {
                var ext = path.extname(file.originalname);
                if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                    res.send({
                        message: "Only jpg, png, gif, jpeg are allowed."
                    });
                    return callback(null, false);
                }
                callback(null, true);
            },
        }).any();

        upload(req, res, function (err) {

            var fileName;
            if (req.files) {
                if (req.files.length < 1) {
                    fileName = "";
                } else {
                    fileName = req.files[0].filename;
                    console.log(req.body.old_profile_pic);
                    if (req.body.old_profile_pic) {
                        if (fs.existsSync('./public/uploads/patients/' + req.body.folder_id + '/' + req.body.old_profile_pic)) {
                            fs.unlinkSync('./public/uploads/patients/' + req.body.folder_id + '/' + req.body.old_profile_pic);
                        }
                    }
                }
            } else {
                fileName = "";
            }

            if (err) {
                res.json({
                    error_code: 1,
                    err_desc: err
                });
                return;
            } else {
                console.log(req.body);
                var call = `call admin_setPatient('` + req.body.first_name + `', '` + req.body.last_name + `', '` + req.body.email + `', '` + req.body.user_name + `','', '` + req.body.phone_prefix + `', '` + req.body.phone + `', '` + req.body.password + `', '` + req.body.gender + `', '` + req.body.dob + `', '` + req.body.address + `', '` + fileName + `', '` + req.body.country + `', '` + req.body.city + `', '` + req.body.zipcode + `', '` + req.body.folder_id + `','` + req.body.ssn + `', '` + req.body.added_by + `', '` + req.body.added_by_id + `', '1', '` + req.session.patientID + `', @providerID, @errorMessage)`;
                connect.query(call, true, function (error, results, fields) {
                    if (error) {
                        res.send("error");
                        return console.error(error.message);
                    } else {
                        res.send({
                            status: "success"
                        });
                    }
                });
            }
        });
    },

    //==========================Add Update Medication===============================//

    addMedicationByPatient: function (req, res) {
        //console.log(req.body);
        if (req.session.patientID) {
            if (req.body.id == 0) {
                var mid = "";
            } else {
                var mid = req.body.id;
            }

            var call = `call patient_add_medication('` + req.body.name + `','` + req.body.dosage + `','` + req.body.instruction + `','` + req.body.what_its_for + `','','','','','` + req.session.patientID + `','','','` + req.body.start_date + `','` + req.body.end_date + `','', '', '', '', '', '','` + req.body.duration + `','` + req.body.refill_frequency + `','` + req.body.remind_me + `','` + req.body.at_time + `','` + req.body.comments + `','1','` + mid + `', @medicationID, @errorMessage)`;
            console.log(call);
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send("error");
                    return console.error(error.message);
                } else {

                    res.send({
                        status: "success"
                    });
                }
            });
        } else {
            res.send("error");
        }

    },

    //==============================================================================//



    //+++++++++++++++++++++++++MEDICATION LIST+++++++++++++++++++++++++++++++++++++++++++++//
    getMedication: function (req, res) {
        if (req.session.patientID) {
            var call = `call patient_getMedication('','` + req.session.patientID + `','')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(results[0]);
                    return console.error(error.message);
                } else {
                    res.send(results[0]);
                }
            });

        } else {
            res.send('error');
        }

    },
    //==================================================================================//


    //+++++++++++++++++++++++++MEDICATION LIST+++++++++++++++++++++++++++++++++++++++++++++//
    getMedication: function (req, res) {
        if (req.session.patientID) {

            if (req.params.id) {
                var call = `call patient_getMedication('','` + req.session.patientID + `','` + req.params.id + `')`;
                connect.query(call, true, function (error, results, fields) {
                    if (error) {
                        res.send(results[0]);
                        return console.error(error.message);
                    } else {
                        res.send(results[0]);
                    }
                });
            } else {
                var call = `call patient_getMedication('','` + req.session.patientID + `','')`;
                connect.query(call, true, function (error, results, fields) {
                    if (error) {
                        res.send(results[0]);
                        return console.error(error.message);
                    } else {
                        res.send(results[0]);
                    }
                });
            }
        } else {
            res.send('error');
        }

    },
    //+++++++++++++++++++++++++Prescription LIST+++++++++++++++++++++++++++++++++++++++++++++//
    getPrescriptionslist: function (req, res) {
        if (req.session.patientID) {
            var call = `call patient_getPrescription('','` + req.session.patientID + `','')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(results[0]);
                    return console.error(error.message);
                } else {
                    res.send(results[0]);
                }
            });

        } else {
            res.send('error');
        }

    },
    //==================================================================================//

    //+++++++++++++++++++++++++Prescription Details+++++++++++++++++++++++++++++++++++++++++++++//
    getPrescriptionsdetails: function (req, res) {
        if (req.params.id) {
            if (req.session.patientID) {
                var call = `call patient_getPrescription('','` + req.session.patientID + `','` + req.params.id + `')`;
                connect.query(call, true, function (error, results, fields) {
                    if (error) {
                        res.send(results[0]);
                        return console.error(error.message);
                    } else {
                        res.send(results[0]);
                    }
                });

            } else {
                res.send('error');
            }
        } else {
            res.send('error');
        }

    },
    //==================================================================================//


    //==========================Add Update Aappointment===============================//

    addAappointment: function (req, res) {
        if (req.session.patientID) {
            console.log('AppId-' + req.body.id);
            var call = `call patient_add_appointment('` + req.session.patientID + `','` + req.body.provider_id + `','` + req.body.purpose + `','` + req.body.patient_comments + `','','0','1','` + req.body.id + `', @appointmentID, @errorMessage)`;
            console.log(call);
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send("error");
                    return console.error(error.message);
                } else {
                    var appointmentID = results[0][0].appointmentID;

                    var schedule = req.body.setDate;
                    var count = schedule.length;
                    console.log('Length-' + count);
                    var flag = 0;
                    for (var i = 0; i < count; i++) {
                        //console.log(schedule[i].date);
                        //console.log(schedule[i].time);
                        var schid = '';
                        if (schedule[i].id == "") {
                            schid = '';
                        } else {
                            schid = schedule[i].id;
                        }

                        //---------Add Appointment schedule---------------------------//
                        var call2 = `call add_appointmentSchedule('` + appointmentID + `','` + schedule[i].date + `','` + schedule[i].time + `','patient','0','` + schid + `', @sheduleID, @errorMessage)`;
                        console.log(call2);
                        connect.query(call2, true, function (error2, results2, fields) {
                            if (error2) {
                                res.send("error");
                                return console.error(error.message);
                            } else {
                                flag++;
                                if (flag == count) {

                                    emailfunction.patientAppointmentEmail(req.body.provider, req.body.patientName, req.body.purpose);
                                    /*var call3 = `call patient_getAllProvider('','`+req.body.provider_id+`')`;
                        connect.query(call3, true, function (error3, results3, fields) {
                        if (error3) {
                        res.send(results3[0]);
                        return console.error(error3.message);
                        } else {
                          emailfunction.patientAppointmentEmail(results3[0], req.body.patientName,req.body.purpose);
                        //res.send(results3[0]);
                        }
                    });*/

                                    res.send({
                                        status: "success"
                                    });
                                }
                            }
                        });
                        //---------------------------------------------------------------//
                    }
                }
            });
        } else {
            res.send("error");
        }

    },

    //==============================================================================//

    //+++++++++++++++++++++++++Appointment List+++++++++++++++++++++++++++++++++++++++++++++//
    patientGetAppointmentList: function (req, res) {
        if (req.session.patientID) {
            var call = `call patient_getAppointment('','` + req.session.patientID + `','')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(results[0]);
                    return console.error(error.message);
                } else {
                    res.send(results[0]);
                }
            });


        } else {
            res.send('error');
        }


    },
    //==================================================================================//
    //+++++++++++++++++++++++++Appointment Single Details+++++++++++++++++++++++++++++++++++++++++++++//
    patientGetAppointmentDetails: function (req, res) {
        if (req.session.patientID) {
            if (req.params.id) {
                var call = `call patient_getAppointment('','','` + req.params.id + `')`;
                connect.query(call, true, function (error, results, fields) {
                    if (error) {
                        res.send(results[0]);
                        return console.error(error.message);
                    } else {
                        res.send(results[0]);
                    }
                });
            } else {
                res.send('error');
            }
        } else {
            res.send('error');
        }

    },


clinicDetails: function (req, res) {       
            if (req.params.id) {
            var call = `call get_clinic('','`+req.params.id+`')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(results[0]);
                    return console.error(error.message);
                } else {
                    res.send(results[0]);
                }
            });
            } else {
            res.send('error');
        }
        

    },


    //==================================================================================//



    //+++++++++++++++++++++++++Schedule List+++++++++++++++++++++++++++++++++++++++++++++//
    getAappointmentSchedule: function (req, res) {
        if (req.params.id) {
            var call = `call patient_getAllAppointmentSchedule('` + req.params.id + `','','')`;
            connect.query(call, true, function (error, results, fields) {
                if (error) {
                    res.send(results[0]);
                    return console.error(error.message);
                } else {
                    res.send(results[0]);
                }
            });


        } else {
            res.send('error');
        }

    },
    //==================================================================================//
    //+++++++++++++++++++++++++Schedule List+++++++++++++++++++++++++++++++++++++++++++++//
    getProviderList: function (req, res) {

        var call = `call patient_getAllProvider('','')`;
        connect.query(call, true, function (error, results, fields) {
            if (error) {
                res.send(results[0]);
                return console.error(error.message);
            } else {
                res.send(results[0]);
            }
        });

    },
    //==================================================================================//

//+++++++++++++++++++++++++Form List+++++++++++++++++++++++++++++++++++++++++++++//
    getForms: function (req, res) {

if (req.session.patientID) {
        var call = `call form_assignDetails('`+req.session.patientID+`','')`;
        connect.query(call, true, function (error, results, fields) {
            if (error) {
                res.send(results[0]);
                return console.error(error.message);
            } else {
                res.send(results[0]);
            }
        });
    }else{
        res.send('error');
    }

    },
    //==================================================================================//

//+++++++++++++++++++++++++Form List+++++++++++++++++++++++++++++++++++++++++++++//
    getFormDetals: function (req, res) {

if (req.session.patientID) {
    if (req.params.id) {
        var call = `call form_assignDetails('`+req.session.patientID+`','`+req.params.id+`')`;
        connect.query(call, true, function (error, results, fields) {
            if (error) {
                res.send(results[0]);
                return console.error(error.message);
            } else {
                res.send(results[0]);
            }
        });
    }else{
        res.send('error');
    }
    }else{
        res.send('error');
    }

    },
    //==================================================================================//

    //==================================================================================//

    /*Medication*/
    addMedication: function (req, res) {

        //console.log(req.body)

    },

    /*ANGULAR JS*/

    dashboard: function (req, res) {
        res.sendFile('public/patient/main.html', {
            root: '.'
        });
    }

}
