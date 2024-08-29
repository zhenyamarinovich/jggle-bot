/**
 * @template T
 */
module.exports = class TaskRunner {
	/**
	 * @typedef {Object} TaskBase
	 * @property {number=} id
	 * @property {T} data
	 * @property {number=} priority
	 */

	/**
	 * @typedef {Object} TaskData
	 * @property {number} id
	 * @property {T} data
	 * @property {string} status
	 * @property {number} priority
	 */

	/**
	 * @typedef {function(T) : Promise<any>} TaskProcess
	 */

	/**
	 * @param {TaskProcess} runTask
	 * @param {TaskProcess | undefined} expireCallback
	 * @param {number} maxConcurrentTasks
	 * @param {number} timeToRun
	 */
	constructor(runTask, expireCallback, maxConcurrentTasks, timeToRun = 30 * 60 * 1000) {
		/**
		 * @private
		 * @type {TaskData[]}
		 */
		this.tasks = [];
		/**
		 * @readonly
		 */
		this.maxConcurrentTasks = maxConcurrentTasks;
		/**
		 * @private
		 * @type {TaskProcess}
		 */
		this.runTask = runTask;
		/**
		 * @private
		 * @type {TaskProcess | undefined}
		 */
		this.expireCallback = expireCallback;

		this.timeToRun = timeToRun;
	}

	setMaxConcurrentTasks(value = 2) {
		this.maxConcurrentTasks = value;

		this.processQueue();
	}

	/**
	 * @param {TaskBase} param0
	 * @returns
	 */
	addToQueue({ id = Math.random(), data, priority = 0 }) {
		if (this.getTaskIndex(id) !== -1) return;

		const task = { id: id, data, status: "Queued", priority };
		this.tasks.push(task);
		this.tasks.sort((a, b) => b.priority - a.priority); // Сортировка по убыванию приоритета
		this.processQueue();
	}

	/**
	 * @private
	 */
	processQueue() {
		const runningTasks = this.tasks.filter((task) => task.status === "Running").length;
		const availableSlots = this.maxConcurrentTasks - runningTasks;

		if (availableSlots <= 0) return;

		const tasksToRun = this.tasks.filter((task) => task.status === "Queued").slice(0, availableSlots);

		for (let i = 0; i < tasksToRun.length; i++) {
			const task = tasksToRun[i];

			task.status = "Running";

			const taskTimeout = setTimeout(() => {
				console.log(`Task ${task.id} exceeded time limit and was terminated.`);
				if (this.expireCallback !== undefined) this.expireCallback(task.data);
				this.done(task);
			}, this.timeToRun);

			this.runTask(task.data).finally((err) => {
				if (err) console.log(err);

				clearTimeout(taskTimeout);
				this.done(task);
			});
		}
	}

	/**
	 * @private
	 */
	done(task) {
		const position = this.getTaskIndex(task.id);

		if (task !== this.tasks[position]) return;

		this.tasks.splice(position, 1);
		this.processQueue();
	}

	get length() {
		return Math.max(this.tasks.length - this.maxConcurrentTasks, 0);
	}

	get total() {
		return this.tasks.length;
	}

	/**
	 * @param {number} task_id
	 */
	getTaskIndex(task_id) {
		for (let i = 0; i < this.tasks.length; i++) {
			if (this.tasks[i].id !== task_id) continue;

			return i;
		}

		return -1;
	}

	/**
	 * @param {number} task_id
	 */
	getTaskPosition(task_id) {
		let position = this.getTaskIndex(task_id);

		if (position < 0) return { place: -1, length: -1 };

		position++;
		position = Math.max(position - this.maxConcurrentTasks, 0);

		return { place: position, length: this.length };
	}
};
