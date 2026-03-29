const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PublicServiceModule", (m) => {
  const publicService = m.contract("PublicService");

  return { publicService };
});