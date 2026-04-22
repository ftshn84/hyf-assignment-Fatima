CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT
);
SELECT *FROM user;

CREATE TABLE task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created DATETIME NOT NULL,
  updated DATETIME NOT NULL,
  due_date DATETIME,
  status TEXT NOT NULL
);

SELECT *FROM task;

CREATE TABLE status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Insert initial statuses
INSERT INTO status (name) VALUES ('Not started'), ('In progress'), ('Done');
-- Modify task table to use status_id
ALTER TABLE task ADD COLUMN status_id INTEGER REFERENCES status(id) DEFAULT 1;
-- Update existing tasks to use status_id
UPDATE task SET status_id = 1 WHERE status = 'Not started';
UPDATE task SET status_id = 2 WHERE status = 'In progress';
UPDATE task SET status_id = 3 WHERE status = 'Done';

-- Finally, remove old status column after migration
ALTER TABLE task DROP COLUMN status;

-- Many-to-many relationship between users and tasks
CREATE TABLE user_task (
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, task_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE
);

-- Link a user to a task
INSERT INTO user_task (user_id, task_id) VALUES (1, 1);

-- Example: Get all tasks with their status ids
SELECT title, status_id FROM task t;

-- Introducing JOIN to show the status name
SELECT title, status.name FROM task
JOIN status ON task.status_id = status.id;

-- Joining even further to get more information
SELECT task.title, status.name AS status_name, user.name AS user_name
FROM task
JOIN status ON task.status_id = status.id
JOIN user_task ON task.id = user_task.task_id
JOIN user ON user_task.user_id = user.id
-- Filter by phone number starting with +45
WHERE user.phone LIKE '+45%'
ORDER BY task_id ASC;

-- 1. Get all tasks assigned to 'John Doe'
SELECT t.title, t.description , s.name  AS status
FROM  task t 
JOIN user_task ut ON t.id =UT.task_id 
JOIN "user" u ON UT.user_id =U.id 
JOIN status s ON t.status_id =s.id 
WHERE u.name ='John Doe'

-- 2. Find all users working on 'Deploy Application'
-- #TODO - Add more users working on this task
SELECT u.name FROM "user" u 
JOIN user_task ut ON u.id =ut.user_id 
JOIN task t ON ut.task_id =t.id 
WHERE t.title ='Deploy Application'

-- 3. Find how many tasks each user is responsible for
SELECT u.name, COUNT(ut.task_id) AS task_count
FROM user u
LEFT JOIN user_task ut ON u.id = ut.user_id
GROUP BY u.name;

-- 4. Find how many completed tasks each user has
SELECT u.name, COUNT(t.id) AS completed_tasks
FROM user u
LEFT JOIN user_task ut ON u.id = ut.user_id
LEFT JOIN task t ON ut.task_id = t.id AND t.status_id = 3
GROUP BY u.name -- Show what happens if we comment this line
ORDER BY completed_tasks DESC;

--Assignment
--1. Task Management Database
--Part 1: Basic CRUD Operations
--1-Insert a new user with your own name and email
INSERT INTO user (name, email, phone)
VALUES ('Fatima Sharifi', 'ftshn84@gmail.com', '+45 12345678');
--2-Insert a new task assigned to yourself 
INSERT INTO task (title, description, created, updated, due_date, status_id)
VALUES (
  'Learn SQL',
  'Practice database queries',
  DATETIME('now'),
  DATETIME('now'),
  DATETIME('now', '+7 days'),
  2  
);
INSERT INTO user_task (user_id, task_id)
VALUES ( (SELECT id FROM user WHERE name = 'Fatima Sharifi'), 
         (SELECT id FROM task WHERE title = 'Learn SQL') );
--Chaking if my name and tasks are there
SELECT 
    t.id,
    t.title,
    t.description,
    t.created,
    t.updated,
    t.due_date,
    s.name AS status,
    u.name AS assigned_user
FROM task t
JOIN status s ON t.status_id = s.id
JOIN user_task ut ON t.id = ut.task_id
JOIN user u ON ut.user_id = u.id
WHERE u.name = 'Fatima Sharifi'
  AND t.title = 'Learn SQL';
--3-Update the title of the task you just created to "Master SQL Basics"
UPDATE task
SET title = 'Master SQL Basics',
    updated = DATETIME('now')
WHERE title = 'Learn SQL';
--4-Change the due date of your task to two weeks from today
UPDATE task
SET due_date = DATETIME('now', '+14 days'),
    updated = DATETIME('now')
WHERE title = 'Master SQL Basics';
--5-Change the status of your task to "Done"
UPDATE task
SET status_id = 3,
    updated = DATETIME('now')
WHERE title = 'Master SQL Basics';
--6-Delete one of the tasks in the database (choose any task)

DELETE FROM task
WHERE title = 'Master SQL Basics';

--Part 2: Working with Relationships
--1-List all users who don't have any tasks assigned
SELECT u.id, u.name , ut.task_id AS task_id
FROM user u
LEFT JOIN user_task ut ON u.id = ut.user_id
WHERE ut.task_id IS NULL;
--2-Find all tasks with a status of "Done"
SELECT 
    t.id,
    t.title,
    t.description,
    t.due_date,
    s.name AS status
FROM task t
JOIN status s ON t.status_id = s.id
WHERE s.name = 'Done';
--3-Find all overdue tasks (due_date is earlier than today)

SELECT 
    t.id,
    t.title,
    t.description,
    t.due_date,
    s.name AS status
FROM task t
JOIN status s ON t.status_id = s.id
WHERE t.due_date < DATE('now');
--Part 3: Modifying the Database Schema
--1-Add a new column called priority to the task table with possible values: 'Low', 'Medium', 'High'. 💡 Remember to provide default values.
ALTER TABLE task
ADD COLUMN priority TEXT 
    DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High'));

--2-Update some existing tasks to have different priority values

UPDATE task
SET priority = 'High'
WHERE title IN ('Deploy Application', 'Write Unit Tests');
--3-Create a new table called category
CREATE TABLE category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL
);

--4-Create a linking table called task_category
CREATE TABLE task_category (
    task_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, category_id),
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE
);

--5-Insert at least 3 categories
INSERT INTO category (name, color)
VALUES 
    ('Work', 'red'),
    ('Personal', 'blue'),
    ('Study', 'green');
--6-Assign categories to at least 5 different tasks

-- Deploy Application → Work
INSERT INTO task_category (task_id, category_id)
SELECT id, 1 FROM task WHERE title = 'Deploy Application';

-- Write Unit Tests → Work
INSERT INTO task_category (task_id, category_id)
SELECT id, 1 FROM task WHERE title = 'Write Unit Tests';

-- Master SQL Basics → Study
INSERT INTO task_category (task_id, category_id)
SELECT id, 3 FROM task WHERE title = 'Master SQL Basics';

-- Write Documentation → Work
INSERT INTO task_category (task_id, category_id)
SELECT id, 1 FROM task WHERE title = 'Write Documentation';

-- Fix Login Bug → Work
INSERT INTO task_category (task_id, category_id)
SELECT id, 1 FROM task WHERE title = 'Fix Login Bug';
------verify the category assignments
SELECT 
    t.id AS task_id,
    t.title AS task_title,
    c.name AS category_name,
    c.color AS category_color
FROM task t
JOIN task_category tc ON t.id = tc.task_id
JOIN category c ON tc.category_id = c.id
ORDER BY t.id;
-----------list tasks grouped by category
SELECT 
    c.name AS category,
    GROUP_CONCAT(t.title, ', ') AS tasks
FROM category c
LEFT JOIN task_category tc ON c.id = tc.category_id
LEFT JOIN task t ON tc.task_id = t.id
GROUP BY c.id
ORDER BY c.name;
---------------------------list categories for each task

SELECT 
    t.id AS task_id,
    t.title AS task_title,
    GROUP_CONCAT(c.name, ', ') AS categories
FROM task t
LEFT JOIN task_category tc ON t.id = tc.task_id
LEFT JOIN category c ON tc.category_id = c.id
GROUP BY t.id, t.title
ORDER BY t.id;


--Part 4: Advanced Queries
--1-Find all tasks in a specific category (e.g., "Work")
SELECT 
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.priority,
    s.name AS status
FROM task t
JOIN task_category tc ON t.id = tc.task_id
JOIN category c ON tc.category_id = c.id
JOIN status s ON t.status_id = s.id
WHERE c.name = 'Work';
--2-List tasks ordered by priority (High to Low) and by due date (earliest first)
SELECT 
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.priority,
    s.name AS status
FROM task t
JOIN status s ON t.status_id = s.id
ORDER BY 
    CASE t.priority
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
    END,
    t.due_date ASC;
--3-Find which category has the most tasks
SELECT 
    c.name AS category,
    COUNT(tc.task_id) AS task_count
FROM category c
LEFT JOIN task_category tc ON c.id = tc.category_id
GROUP BY c.id
ORDER BY task_count DESC
LIMIT 1;
--4-Get all high priority tasks that are either "In Progress" or "To Do"

---TEST
SELECT id, title, priority
FROM task
WHERE priority = 'High';

SELECT * FROM status;

---- Answer
SELECT 
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.priority,
    s.name AS status
FROM task t
JOIN status s ON t.status_id = s.id
WHERE t.priority = 'High'
  AND s.name IN ('In progress', 'To Do');

--5-Find users who have tasks in more than one category--IT is empty dont know what hapend befor in some places I need to over look
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    COUNT(DISTINCT c.id) AS category_count
FROM user u
JOIN user_task ut ON u.id = ut.user_id
JOIN task t ON ut.task_id = t.id
JOIN task_category tc ON t.id = tc.task_id
JOIN category c ON tc.category_id = c.id
GROUP BY u.id, u.name
HAVING COUNT(DISTINCT c.id) > 1;

