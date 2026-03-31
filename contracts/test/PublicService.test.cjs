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

    const STAKE_AMOUNT = ethers.parseEther("0.00002");
    const REPORT_FEE = ethers.parseEther("0.000007");
    const REWARD_AMOUNT = ethers.parseEther("0.000001");
    const UPDATED_STAKE_AMOUNT = ethers.parseEther("0.00003");
    const UPDATED_REPORT_FEE = ethers.parseEther("0.000009");
    const UPDATED_REWARD_AMOUNT = ethers.parseEther("0.000002");

    describe("F2: Dynamic Economic Params", function () {
        it("Should initialize with default economic params", async function () {
            const { publicService } = await loadFixture(deployPublicServiceFixture);
            expect(await publicService.STAKE_AMOUNT()).to.equal(STAKE_AMOUNT);
            expect(await publicService.REPORT_FEE()).to.equal(REPORT_FEE);
            expect(await publicService.REWARD_AMOUNT()).to.equal(REWARD_AMOUNT);
        });

        it("Admin can update all params via setEconomicParams", async function () {
            const { publicService, admin } = await loadFixture(deployPublicServiceFixture);
            await expect(
                publicService.connect(admin).setEconomicParams(
                    UPDATED_STAKE_AMOUNT,
                    UPDATED_REPORT_FEE,
                    UPDATED_REWARD_AMOUNT
                )
            )
                .to.emit(publicService, "EconomicParamsUpdated")
                .withArgs(UPDATED_STAKE_AMOUNT, UPDATED_REPORT_FEE, UPDATED_REWARD_AMOUNT, admin.address);

            expect(await publicService.STAKE_AMOUNT()).to.equal(UPDATED_STAKE_AMOUNT);
            expect(await publicService.REPORT_FEE()).to.equal(UPDATED_REPORT_FEE);
            expect(await publicService.REWARD_AMOUNT()).to.equal(UPDATED_REWARD_AMOUNT);
        });

        it("Admin can update each param independently", async function () {
            const { publicService, admin } = await loadFixture(deployPublicServiceFixture);

            await publicService.connect(admin).setStakeAmount(UPDATED_STAKE_AMOUNT);
            expect(await publicService.STAKE_AMOUNT()).to.equal(UPDATED_STAKE_AMOUNT);
            expect(await publicService.REPORT_FEE()).to.equal(REPORT_FEE);
            expect(await publicService.REWARD_AMOUNT()).to.equal(REWARD_AMOUNT);

            await publicService.connect(admin).setReportFee(UPDATED_REPORT_FEE);
            expect(await publicService.REPORT_FEE()).to.equal(UPDATED_REPORT_FEE);

            await publicService.connect(admin).setRewardAmount(UPDATED_REWARD_AMOUNT);
            expect(await publicService.REWARD_AMOUNT()).to.equal(UPDATED_REWARD_AMOUNT);
        });

        it("Non-admin cannot update economic params", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            await expect(
                publicService.connect(citizen1).setEconomicParams(
                    UPDATED_STAKE_AMOUNT,
                    UPDATED_REPORT_FEE,
                    UPDATED_REWARD_AMOUNT
                )
            ).to.be.reverted;
        });

        it("Should reject zero values", async function () {
            const { publicService, admin } = await loadFixture(deployPublicServiceFixture);
            await expect(
                publicService.connect(admin).setEconomicParams(0, UPDATED_REPORT_FEE, UPDATED_REWARD_AMOUNT)
            ).to.be.revertedWithCustomError(publicService, "InvalidEconomicParams");
            await expect(
                publicService.connect(admin).setEconomicParams(UPDATED_STAKE_AMOUNT, 0, UPDATED_REWARD_AMOUNT)
            ).to.be.revertedWithCustomError(publicService, "InvalidEconomicParams");
            await expect(
                publicService.connect(admin).setEconomicParams(UPDATED_STAKE_AMOUNT, UPDATED_REPORT_FEE, 0)
            ).to.be.revertedWithCustomError(publicService, "InvalidEconomicParams");
        });
    });

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

    describe("Treasury & Resolution Accounting", function () {
        it("Tracks direct treasury funding through receive()", async function () {
            const { publicService, admin } = await loadFixture(deployPublicServiceFixture);
            const funding = ethers.parseEther("0.005");

            await expect(
                admin.sendTransaction({ to: await publicService.getAddress(), value: funding })
            )
                .to.emit(publicService, "TreasuryFunded")
                .withArgs(admin.address, funding, funding);

            expect(await publicService.treasuryBalance()).to.equal(funding);
        });

        it("Treats REPORT_FEE as treasury income and report pool on submit", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });

            await expect(
                publicService.connect(citizen1).submitReport("h1", [], "l1", { value: REPORT_FEE })
            )
                .to.emit(publicService, "ReportFeeCollected")
                .withArgs(0, citizen1.address, REPORT_FEE, REPORT_FEE);

            expect(await publicService.reportPools(0)).to.equal(REPORT_FEE);
            expect(await publicService.treasuryBalance()).to.equal(REPORT_FEE);
        });

        it("Validates reportId existence before resolution logic", async function () {
            const { publicService, admin } = await loadFixture(deployPublicServiceFixture);
            await expect(publicService.connect(admin).adminResolve(999, true)).to.be.revertedWithCustomError(
                publicService,
                "ReportNotFound"
            );
        });

        it("Approve flow pays admin/reporter/winners and slashes incorrect voters from stake balances", async function () {
            const { publicService, admin, citizen1, citizen2, citizen3 } = await loadFixture(deployPublicServiceFixture);
            const funding = ethers.parseEther("0.005");

            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen2).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen3).registerCitizen({ value: STAKE_AMOUNT });
            await admin.sendTransaction({ to: await publicService.getAddress(), value: funding });

            await publicService.connect(citizen1).submitReport("h1", [], "l1", { value: REPORT_FEE });
            await publicService.connect(citizen2).voteUp(0);
            await publicService.connect(citizen3).voteDown(0);

            const reporterBefore = await ethers.provider.getBalance(citizen1.address);
            const winnerBefore = await ethers.provider.getBalance(citizen2.address);

            await expect(publicService.connect(admin).adminResolve(0, true))
                .to.emit(publicService, "AdminFeePaid")
                .withArgs(0, admin.address, REWARD_AMOUNT);

            await expect(publicService.connect(admin).adminResolve(0, true)).to.be.revertedWithCustomError(
                publicService,
                "CannotUpdateReport"
            );

            expect(await publicService.isLocked(citizen3.address)).to.equal(true);
            expect(await publicService.stakes(citizen3.address)).to.equal(STAKE_AMOUNT - REWARD_AMOUNT);

            const reporterAfter = await ethers.provider.getBalance(citizen1.address);
            const winnerAfter = await ethers.provider.getBalance(citizen2.address);
            expect(reporterAfter - reporterBefore).to.equal(REPORT_FEE + REWARD_AMOUNT);
            expect(winnerAfter - winnerBefore).to.equal(REWARD_AMOUNT);
        });

        it("Top ups winner rewards from common treasury when report pool is below nominal target", async function () {
            const { publicService, admin, citizen1, citizen2, citizen3 } = await loadFixture(deployPublicServiceFixture);
            const funding = ethers.parseEther("0.005");

            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen2).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen3).registerCitizen({ value: STAKE_AMOUNT });
            await admin.sendTransaction({ to: await publicService.getAddress(), value: funding });

            await publicService.connect(citizen1).submitReport("h1", [], "l1", { value: REPORT_FEE });
            await publicService.connect(citizen2).voteUp(0);
            await publicService.connect(citizen3).voteUp(0);

            const winner1Before = await ethers.provider.getBalance(citizen2.address);
            const winner2Before = await ethers.provider.getBalance(citizen3.address);

            await expect(publicService.connect(admin).adminResolve(0, true))
                .to.emit(publicService, "VoterRewardsDistributed")
                .withArgs(0, true, REWARD_AMOUNT * 2n, REWARD_AMOUNT, 2);

            const winner1After = await ethers.provider.getBalance(citizen2.address);
            const winner2After = await ethers.provider.getBalance(citizen3.address);
            expect(winner1After - winner1Before).to.equal(REWARD_AMOUNT);
            expect(winner2After - winner2Before).to.equal(REWARD_AMOUNT);
        });

        it("Reject flow keeps report fee as treasury income, slashes incorrect side, and distributes resolved pool", async function () {
            const { publicService, admin, citizen1, citizen2, citizen3 } = await loadFixture(deployPublicServiceFixture);

            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen2).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen3).registerCitizen({ value: STAKE_AMOUNT });

            await publicService.connect(citizen1).submitReport("h1", [], "l1", { value: REPORT_FEE });
            await publicService.connect(citizen2).voteUp(0);
            await publicService.connect(citizen3).voteDown(0);

            const winnerBefore = await ethers.provider.getBalance(citizen3.address);

            await expect(publicService.connect(admin).adminResolve(0, false))
                .to.emit(publicService, "ReporterRefunded")
                .withArgs(0, citizen1.address, 0, false);

            expect(await publicService.stakes(citizen1.address)).to.equal(STAKE_AMOUNT - REWARD_AMOUNT);
            expect(await publicService.stakes(citizen2.address)).to.equal(STAKE_AMOUNT - REWARD_AMOUNT);
            expect(await publicService.isLocked(citizen1.address)).to.equal(true);
            expect(await publicService.isLocked(citizen2.address)).to.equal(true);

            const winnerAfter = await ethers.provider.getBalance(citizen3.address);
            expect(winnerAfter - winnerBefore).to.equal(REPORT_FEE + REWARD_AMOUNT);
        });
    });
});
