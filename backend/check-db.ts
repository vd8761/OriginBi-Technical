import pool from "./src/config/db";

async function check() {
    try {
        const assessments = await pool.query("SELECT assessment_id, assessment_code, assessment_name, module_type, status FROM tech_assessments");
        console.log("\n=== ASSESSMENTS ===");
        console.log(assessments.rows);

        const aptCount = await pool.query("SELECT COUNT(*) as count FROM tech_aptitude_questions");
        console.log("\n=== APTITUDE QUESTIONS ===");
        console.log(`Count: ${aptCount.rows[0].count}`);

        const grammarCount = await pool.query("SELECT COUNT(*) as count FROM tech_grammar_questions");
        console.log("\n=== GRAMMAR QUESTIONS ===");
        console.log(`Count: ${grammarCount.rows[0].count}`);

        const codingCount = await pool.query("SELECT COUNT(*) as count FROM tech_coding_questions");
        console.log("\n=== CODING QUESTIONS ===");
        console.log(`Count: ${codingCount.rows[0].count}`);

        const mncCount = await pool.query("SELECT COUNT(*) as count FROM tech_mnc_questions");
        console.log("\n=== MNC QUESTIONS ===");
        console.log(`Count: ${mncCount.rows[0].count}`);

        const roleCount = await pool.query("SELECT COUNT(*) as count FROM tech_role_questions");
        console.log("\n=== ROLE QUESTIONS ===");
        console.log(`Count: ${roleCount.rows[0].count}`);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

check();
