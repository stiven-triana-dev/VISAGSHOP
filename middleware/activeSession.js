'use strict';
module.exports=process.env.DATABASE_URL?require('../cloud/sessions'):require('./customerSession');
