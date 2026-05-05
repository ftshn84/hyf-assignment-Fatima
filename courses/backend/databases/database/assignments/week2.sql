-- ============================================================
-- Week 2 Assignment — Databases
-- Student: Fatima Sharifi
-- ============================================================

-- Part A-1, Question 1: Count the total number of tasks in the database

SELECT COUNT(*) AS total_tasks
FROM task;
-- Part A-2, Count how many tasks each user has been assigned (include users with zero tasks)
SELECT
    u.id,
    u.name,
    COUNT(t.id) AS task_count
FROM user u
LEFT JOIN task t ON t.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;
-- Part A-3, Find the number of tasks per status (e.g., how many are "To Do", "In Progress", "Done")
--test:Check the columns in task table
PRAGMA table_info(task);

SELECT
    s.name AS status,
    COUNT(t.id) AS task_count
FROM task t
JOIN status s ON t.status_id = s.id
GROUP BY s.name
ORDER BY task_count DESC;

-- Part A-4, Find the user who has the most tasks assigned
PRAGMA table_info(task);

SELECT
    u.id,
    u.name,
    COUNT(t.id) AS task_count
FROM user u
LEFT JOIN task t ON t.status_id   = u.id
GROUP BY u.id, u.name
ORDER BY task_count DESC
LIMIT 5;
-- Part A-5, Calculate the average number of tasks per user (only count users who have at least one task)
SELECT AVG(task_count) AS avg_tasks_per_user
FROM (
    SELECT
        u.id,
        COUNT(t.id) AS task_count
    FROM user u
    LEFT JOIN task t ON 1 = 0   -- no relationship exists
    GROUP BY u.id
    HAVING COUNT(t.id) > 0      -- users with at least 1 task
);

-- Part A-6,Find the earliest and latest due date across all tasks
SELECT
    MIN(due_date) AS earliest_due_date,
    MAX(due_date) AS latest_due_date
FROM task;

-- Part A-7,List each category along with the number of tasks it contains, ordered from most to least tasks
PRAGMA table_info(category);

SELECT
    c.id,
    c.name,
    COUNT(t.id) AS task_count
FROM category c
LEFT JOIN task t ON t.category_id = c.id
GROUP BY c.id, c.name
ORDER BY task_count DESC;


-- Part A-8,Find all users who have more than 2 tasks assigned to them

SELECT
    u.id,
    u.name,
    COUNT(t.id) AS task_count
FROM user u
JOIN task t ON t.user_id = u.id
GROUP BY u.id, u.name
HAVING COUNT(t.id) > 2;
---test
UPDATE task SET user_id = 1 WHERE id IN (1,2,3,4);


--Part B: SQL Injection
--1. Why is the original code vulnerable?Because it concatenates raw user input into an SQL query.
--2. How could an attacker exploit it?By injecting SQL that changes the query’s structure.
--3. How do parameterized queries prevent this?They separate code from data, so injected text cannot become SQL commands.
-- Part B.1: 
-- If userName is set to: ' OR '1'='1
-- the query becomes:
-- SELECT * FROM task 
-- WHERE user_id = (SELECT id FROM user WHERE name = '' OR '1'='1')

-- The condition '1'='1' is always TRUE.
-- This means the subquery returns ALL user IDs instead of just one.
-- As a result, the outer query returns ALL tasks in the database.

-- This is dangerous because the attacker can see data they should not have access to.
-- It also proves that the query is injectable, meaning the attacker can now try more harmful inputs.


-- Part B.1: 
-- An attacker could inject a string that closes the quote,
-- ends the original query, and then adds a destructive command.
-- For example, something structured like:

-- ' ; DELETE FROM task ; --

-- Explanation:
-- 1. '        → closes the original string
-- 2. ;        → ends the original SELECT query
-- 3. DELETE FROM task  → a second SQL command that wipes the table
-- 4. ; --     → ends the injected command and comments out the rest

-- This works because the vulnerable code directly concatenates user input
-- into the SQL string, allowing the attacker to execute additional commands.
--partB.2:Fix the Vulnerability
-- FIXED VERSION (using parameterised queries)
--
-- The original function was vulnerable because it directly concatenated
-- user input into the SQL string. This allowed attackers to inject SQL.
--
-- The safe pattern is to use parameterised queries (also called prepared
-- statements). These ensure that user input is always treated as data,
-- never as executable SQL.
--
-- Example secure version in Node.js with SQLite:
--
-- function getTasksByUser(userName) {
--   const query = `
--     SELECT * FROM task
--     WHERE user_id = (SELECT id FROM user WHERE name = ?)
--   `;
--   db.all(query, [userName], (err, rows) => console.log(rows));
-- }
--
-- Explanation:
-- 1. The SQL query uses a placeholder (?) instead of inserting user input.
-- 2. The value is passed separately in the array [userName].
-- 3. The database engine safely escapes and binds the value.
-- 4. This prevents SQL injection because the input cannot change the
--    structure of the SQL query.
--
-- Key takeaway:
-- Never concatenate user input into SQL strings.
-- Always use parameterised queries to separate code from data.


-- Part C, Question 1: Write a transaction that reassigns all tasks from one user to another, then deletes the original user. Use BEGIN TRANSACTION, COMMIT, and ROLLBACK

BEGIN TRANSACTION;

  -- Reassign all tasks 
  UPDATE task
  SET user_id = :new_user_id
  WHERE user_id = :old_user_id;

  -- Delete the departing user
  DELETE FROM user
  WHERE id = :old_user_id;

COMMIT;

-- Part C, Question 1: Write a second transaction that demonstrates a deliberate rollback
BEGIN TRANSACTION;

  -- Attempt to reassign tasks (this would normally succeed)
  SET user_id = 1
  WHERE user_id = 2;

 
  INSERT INTO task (title, status_id, user_id)
  VALUES ('This will fail', 9999, 1);  -- 9999 does not exist
--SQL Error [19]: [SQLITE_CONSTRAINT_NOTNULL] A NOT NULL constraint failed (NOT NULL constraint failed: task.created)
-- Because the INSERT fails, SQLite rolls back the entire transaction.
ROLLBACK;

-- Part D.1: Create "Urgent" category and assign tasks

BEGIN TRANSACTION;

  -- Create the new category
INSERT INTO category (name, color)
  VALUES ('Urgent', 'red');

 
  UPDATE task
  SET category_id = last_insert_rowid()
  WHERE status_id IN (
      SELECT id FROM status
      WHERE name IN ('In Progress', 'To Do')
  );

COMMIT;
-- Part D.2: Dashboard Summary Query
-- Part D – Dashboard Summary

  
SELECT
  -- Total number of tasks
  (SELECT COUNT(*) FROM task) AS total_tasks,

  -- Number of completed tasks
  (SELECT COUNT(*)
   FROM task t
   JOIN status s ON t.status_id = s.id
   WHERE s.name = 'Done') AS completed_tasks,

  -- Number of overdue tasks
  (SELECT COUNT(*)
   FROM task
   WHERE due_date < DATE('now')) AS overdue_tasks,

  -- Number of users with at least one task
  (SELECT COUNT(*)
   FROM user u
   WHERE EXISTS (
       SELECT 1 FROM task t WHERE t.user_id = u.id
   )) AS users_with_tasks;





