const { predictCrowdByHour, forecastDemand, frequentlyBoughtWith } = require('../utils/analyticsService');

exports.crowdPrediction = async (req, res) => {
  const data = await predictCrowdByHour();
  res.json(data);
};

exports.demandForecast = async (req, res) => {
  const data = await forecastDemand();
  res.json(data);
};

exports.recommendations = async (req, res) => {
  const data = await frequentlyBoughtWith(req.params.menuItemId);
  res.json(data);
};
