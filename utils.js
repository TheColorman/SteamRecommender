// Denne fil er til små funktioner som hedder "helperfunctions".
// De bliver brugt rundt omkring i koden til forskellige ting

// async/await error catcher
const catchAsyncErrors = fn => (            // den her funktion sørger for at programmet kan fange fejl
    (req, res, next) => {                   // når den bruger async/await.
      const routePromise = fn(req, res, next);      // async/await er en ting i JavaScript som gør
      if (routePromise.catch) {                     // at programmet venter på at et stykke kode
        routePromise.catch(err => next(err));       // bliver færdigt, fx. hvis man skal forbinde
      }                                             // til en API, som kan tage lidt tid at svarer.
    }
);

module.exports = {
    catchAsync: catchAsyncErrors
}