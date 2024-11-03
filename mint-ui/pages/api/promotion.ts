import type {NextApiRequest, NextApiResponse} from "next";
import fs from "fs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const data = req.body;
    const jsonString = JSON.stringify(data)
    console.log(jsonString)
    fs.appendFile('test.txt', jsonString, 'utf8', (err: any) => {
      if (err) {
        console.error(err);
      } else {
        console.log("Worked");
      }
    })
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}