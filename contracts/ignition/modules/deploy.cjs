const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PublicServiceModule", (m) => {
  const adminAddress = "0x71097549E8e0b9A1c5dd9dB23aE0d3c8dC62846D";
  const publicService = m.contract("PublicService", [adminAddress]);

  return { publicService };
});