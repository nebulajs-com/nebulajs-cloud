import TailFile from '@logdna/tail-file'
import stripAnsi from 'strip-ansi'
import { Writable } from 'stream'

export class CommonUtil {
    static async tailFile(logFile, stream: Writable) {
        await new Promise((resolve, reject) => {
            const tail = new TailFile(logFile, {
                encoding: 'utf8',
                startPos: 0,
            })
                .on('data', (chunk) => {
                    const data = stripAnsi(chunk.toString())
                    stream.write(data)
                })
                .on('tail_error', (err) => {
                    stream.end('Tail file error')
                    resolve({})
                })
                .on('error', (err) => {
                    stream.end('Tail file stream error')
                    resolve({})
                })
                .start()
                .catch((err) => {
                    reject(err)
                })
        })
    }
}
