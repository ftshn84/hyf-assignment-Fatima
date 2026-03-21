// Exercise 5: runSequentially utility
function runSequentially(tasks, finalCallback) {
    function runTask(index) {
        if (index === tasks.length) {
            finalCallback();
            return;
        }
        tasks[index](() => runTask(index + 1));
    }
    runTask(0);
}

// Test
const tasks = [
    (done) =>
        setTimeout(() => {
            console.log("Task 1");
            done();
        }, 300),
    (done) =>
        setTimeout(() => {
            console.log("Task 2");
            done();
        }, 200),
    (done) =>
        setTimeout(() => {
            console.log("Task 3");
            done();
        }, 100),
];

runSequentially(tasks, () => {
    console.log("All tasks complete!");
});
