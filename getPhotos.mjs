import fs from "fs";
import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv({
  path: ".env",
});

const dirname = process.env.DIRNAME;
const timeout = process.env.TIMEOUT;
const retriesLimit = process.env.RETRIES;

const download = async ({ url = "", name = "" }) => {
  const res = await axios.get(url, {
    timeout,
    responseType: "arraybuffer",
  });

  // Ищет расширение фото. Если не нашел, то пустая строка.
  const fileExt = url.match(/\.[a-z]+?(?=\?)/)?.[0] || "";

  // Создаем буфер из дв. данных, пришеших с адреса обращения.
  const buf = Buffer.from(res.data);

  // Если директории нет - создаем
  if (!fs.existsSync(dirname)) {
    fs.mkdir(dirname, () => {});
  }

  const path = `${dirname}/${name}${fileExt}`;

  // Пишем в директорию
  fs.writeFileSync(path, buf);

  console.log(`Сохранено в: ${path}`);
};

const main = async () => {
  // Устанавливаем все параметры для запроса
  const formData = new FormData();
  formData.append("owner_id", process.env.OWNER_ID);
  formData.append("album_id", process.env.ALBUM_ID);
  formData.append("photo_sizes", process.env.PHOTO_SIZES);
  formData.append("offset", process.env.OFFSET);
  formData.append("count", process.env.COUNT);
  formData.append("access_token", process.env.ACCESS_TOKEN);
  formData.append("v", process.env.V);

  try {
    console.log(`\nПробую получить фотографии...\n`);
    const { data: photos } = await axios.post(
      "https://api.vk.com/method/photos.get",
      formData
    );

    if (photos?.error?.error_msg) {
      throw new Error(photos.error.error_msg);
    }

    // Перебираем полученные объекты с ссылкой на фото и сохраняем содержимое
    // по ссылке на жесткий диск.
    photos.response.items.forEach(async (item, index) => {
      const { orig_photo } = item;
      const { url } = orig_photo || item.sizes[0];
      let retries = retriesLimit;

      try {
        while (retries !== 0) {
          try {
            await download({ url, name: index });
            retries = 0;
          } catch (err) {
            retries--;
            console.log(
              `Не удалось скачать ${url}, Осталось попыток: ${retries}`
            );
          }
        }
      } catch (err) {
        console.log(
          `\nЧто-то пошло не так у ${JSON.stringify(
            orig_photo,
            null,
            1
          )}\n${err}`
        );
      }
    });
  } catch (e) {
    console.log(
      `\nПри попытке получить фотографии, что-то пошло не так... ${e}\n`
    );
  }
};

main();
