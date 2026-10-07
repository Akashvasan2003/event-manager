const express = require('express');

const controller = require('../controllers/requirementController');

const router = express.Router();

router.route('/').post(controller.createRequirement).get(controller.getRequirements);

router.route('/:id').get(controller.getRequirementById);

module.exports = router;
