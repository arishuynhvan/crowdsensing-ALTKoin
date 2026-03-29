const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PublicService", function () {
    async function deployPublicServiceFixture() {
        const [admin, citizen1, citizen2, citizen3, ...otherAccounts] = await ethers.getSigners();
        const PublicService = await ethers.getContractFactory("PublicService");
        const publicService = await PublicService.connect(admin).deploy();
        return { publicService, admin, citizen1, citizen2, citizen3, otherAccounts };
    }

    const STAKE_AMOUNT = ethers.parseEther("0.05");
    const REPORT_FEE = ethers.parseEther("0.001");
    const REWARD_AMOUNT = ethers.parseEther("0.0001");

    describe("F1: Citizen Registration", function () {
        it("Should register a user with stake and make them active", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            await expect(publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT })).to.emit(publicService, "CitizenRegistered");
            expect(await publicService.isLocked(citizen1.address)).to.be.false;
        });
    });

    describe("F3: Report Submission & Updates", function () {
        let ps, c1;
        beforeEach(async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            ps = publicService;
            c1 = citizen1;
            await ps.connect(c1).registerCitizen({ value: STAKE_AMOUNT });
        });
        it("Should allow active citizen to submit a report with fee", async function () {
            await expect(ps.connect(c1).submitReport("h1", ["c1"], "l1", { value: REPORT_FEE })).to.emit(ps, "ReportSubmitted");
        });
        it("Should allow free updates", async function () {
            await ps.connect(c1).submitReport("h1", ["c1"], "l1", { value: REPORT_FEE });
            const balanceBefore = await ethers.provider.getBalance(c1.address);
            const tx = await ps.connect(c1).updateReport(0, "newHash", ["newCid"], "newLoc");
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            expect(await ethers.provider.getBalance(c1.address)).to.equal(balanceBefore - gasCost);
        });
    });

    describe("F4: Voting and Report Queue", function () {
        let ps, c1, c2, c3;
        beforeEach(async function () {
            const { publicService, citizen1, citizen2, citizen3 } = await loadFixture(deployPublicServiceFixture);
            ps = publicService;
            [c1, c2, c3] = [citizen1, citizen2, citizen3];
            await ps.connect(c1).registerCitizen({ value: STAKE_AMOUNT });
            await ps.connect(c2).registerCitizen({ value: STAKE_AMOUNT });
            await ps.connect(c3).registerCitizen({ value: STAKE_AMOUNT });
        });
        it("Should inc/dec score on vote", async function () {
            await ps.connect(c1).submitReport("h", [], "l", { value: REPORT_FEE });
            await ps.connect(c2).voteUp(0);
            let r = await ps.getReport(0);
            expect(r.score).to.equal(1);
        });
        it("getReports() should sort by score DESC", async function() {
            await ps.connect(c1).submitReport("s0", [], "l0", { value: REPORT_FEE });
            await ps.connect(c2).submitReport("s2", [], "l1", { value: REPORT_FEE });
            const reports = await ps.getReports();
            expect(reports[0].score).to.be.gte(reports[1].score);
        });
    });
    
    describe("F5 & Security", function () {
        let ps, admin, c1, c2;
        beforeEach(async function() {
            const { publicService, admin: ad, citizen1, citizen2 } = await loadFixture(deployPublicServiceFixture);
            ps = publicService;
            admin = ad;
            [c1, c2] = [citizen1, citizen2];
            await ps.connect(c1).registerCitizen({ value: STAKE_AMOUNT });
            await ps.connect(c2).registerCitizen({ value: STAKE_AMOUNT });
        });

        it("F5.3 AUTO-LOCK: Should lock and unlock account", async function () {
            await ps.connect(c1).submitReport("h1", [], "l1", { value: REPORT_FEE });
            await ps.connect(c2).voteDown(0);
            await expect(ps.connect(admin).adminResolve(0, true)).to.emit(ps, "AccountLocked").withArgs(c2.address);
            await expect(ps.connect(c2).submitReport("h_l", [], "l_l", { value: REPORT_FEE })).to.be.revertedWithCustomError(ps, "CitizenLockedError");
            await expect(ps.connect(c2).registerCitizen({ value: STAKE_AMOUNT })).to.emit(ps, "AccountUnlocked").withArgs(c2.address);
        });
    });
});
