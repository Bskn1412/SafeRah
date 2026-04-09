export class UploadManager {
  constructor(maxParallel = 3) {
    this.maxParallel = maxParallel;
    this.queue = [];
    this.running = [];
    this.listeners = {};
  }

  on(event, cb) {
    this.listeners[event] = cb;
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event](data);
    }
  }

  add(uploadTask) {
    this.queue.push(uploadTask);
    this.run();
  }

  async run() {
    while (this.running.length < this.maxParallel && this.queue.length) {
      const task = this.queue.shift();

      const promise = task()
        .catch(err => console.error(err))
        .finally(() => {
          this.running = this.running.filter(p => p !== promise);
          this.run();
        });

      this.running.push(promise);
    }
  }
}