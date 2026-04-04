import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://healthcare-b57f7-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

export const subscribeToVitals = (callback) => {
  const dataRef = ref(database, 'data');
  onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};
